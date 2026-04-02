/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import type { PersistedTask } from '../tasks/types';
import type { FeaturesIdentificationTaskParams } from '../tasks/task_definitions/features_identification';

jest.mock('../../routes/utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn().mockResolvedValue('connector-1'),
}));

type TaskForTest = PersistedTask<FeaturesIdentificationTaskParams>;

const makeTask = (
  streamName: string,
  overrides: Partial<Omit<TaskForTest, 'task'>> & {
    task?: Partial<TaskForTest['task']>;
  } = {}
): TaskForTest => {
  const { task: taskOverrides, ...rest } = overrides;
  return {
    id: `task-${streamName}`,
    type: 'streams:features-identification',
    space: 'default',
    created_at: '2025-01-01T00:00:00Z',
    status: TaskStatus.Completed,
    last_completed_at: '2025-01-01T00:05:00Z',
    ...rest,
    task: { params: { streamName, start: 0, end: 1 }, ...taskOverrides },
  } as TaskForTest;
};

const makeStream = (name: string, opts?: { query?: boolean; classic?: boolean }) => ({
  name,
  ...(opts?.query
    ? { query: { view: `$.${name}` } }
    : opts?.classic
    ? { ingest: { classic: {} } }
    : { ingest: { wired: {} } }),
});

const scheduledNames = (output: Record<string, unknown>) =>
  (output.scheduled as Array<{ streamName: string }>).map((s) => s.streamName);

describe('kiSelectStreamsStep handler', () => {
  let handler: (context: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>;

  const mockTaskClient = { findByType: jest.fn(), schedule: jest.fn() };
  const mockStreamsClient = { listStreams: jest.fn() };
  const mockModelSettingsClient = { getSettings: jest.fn() };
  const mockUiSettingsClient = {};
  const mockLogger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() };

  const mockGetScopedClients = jest.fn().mockResolvedValue({
    streamsClient: mockStreamsClient,
    taskClient: mockTaskClient,
    modelSettingsClient: mockModelSettingsClient,
    uiSettingsClient: mockUiSettingsClient,
  });

  const makeContext = (input: Record<string, unknown> = {}) => ({
    input,
    contextManager: { getFakeRequest: jest.fn().mockReturnValue({}) },
    logger: mockLogger,
    abortSignal: new AbortController().signal,
  });

  const enabledSettings = (overrides = {}) => ({
    continuousKiExtraction: { enabled: true, ...overrides },
  });

  beforeAll(async () => {
    const workflowsExtensions = { registerStepDefinition: jest.fn() };
    const { registerKiSelectStreamsStep } = await import('./ki_select_streams_step');

    registerKiSelectStreamsStep({
      workflowsExtensions: workflowsExtensions as never,
      getScopedClients: mockGetScopedClients as never,
      logger: mockLogger as never,
    });

    handler = workflowsExtensions.registerStepDefinition.mock.calls[0][0].handler;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetScopedClients.mockResolvedValue({
      streamsClient: mockStreamsClient,
      taskClient: mockTaskClient,
      modelSettingsClient: mockModelSettingsClient,
      uiSettingsClient: mockUiSettingsClient,
    });
    mockModelSettingsClient.getSettings.mockResolvedValue(enabledSettings());
    mockStreamsClient.listStreams.mockResolvedValue([]);
    mockTaskClient.findByType.mockResolvedValue([]);
    mockTaskClient.schedule.mockResolvedValue(undefined);
  });

  it('throws when continuous KI extraction is disabled', async () => {
    mockModelSettingsClient.getSettings.mockResolvedValue({
      continuousKiExtraction: { enabled: false },
    });

    await expect(handler(makeContext())).rejects.toThrow('Continuous KI extraction is disabled');
  });

  it('skips unsupported stream types and reports them', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([
      makeStream('logs'),
      makeStream('my-query', { query: true }),
    ]);

    const { output } = await handler(makeContext());

    expect(mockTaskClient.schedule).toHaveBeenCalledTimes(1);
    expect(scheduledNames(output)).toEqual(['logs']);
    expect(output.unsupported).toEqual(['my-query']);
  });

  it('excludes streams matching exclude patterns', async () => {
    mockModelSettingsClient.getSettings.mockResolvedValue(
      enabledSettings({ excludedStreamPatterns: 'debug-*, test-*' })
    );
    mockStreamsClient.listStreams.mockResolvedValue([
      makeStream('logs'),
      makeStream('debug-app'),
      makeStream('test-data'),
    ]);

    const { output } = await handler(makeContext());

    expect(output.excluded).toEqual(['debug-app', 'test-data']);
    expect(scheduledNames(output)).toEqual(['logs']);
  });

  it('treats streams without a task as never-processed candidates', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([
      makeStream('stream-a'),
      makeStream('stream-b'),
    ]);

    const { output } = await handler(makeContext());

    expect(scheduledNames(output)).toEqual(['stream-a', 'stream-b']);
  });

  it('identifies already running (in-progress, non-stale) tasks', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('running-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('running-stream', {
        status: TaskStatus.InProgress,
        created_at: new Date().toISOString(),
      }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.alreadyRunning).toHaveLength(1);
    expect(output.scheduled).toEqual([]);
  });

  it('treats BeingCanceled tasks as already running', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('canceling-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('canceling-stream', {
        status: TaskStatus.BeingCanceled,
        created_at: new Date().toISOString(),
      }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.alreadyRunning).toHaveLength(1);
    expect(output.scheduled).toEqual([]);
  });

  it('counts stale in-progress tasks as already running', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('stale-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('stale-stream', {
        status: TaskStatus.InProgress,
        last_completed_at: undefined,
      }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.alreadyRunning).toHaveLength(1);
    expect(output.scheduled).toEqual([]);
  });

  it('marks recently completed tasks as up-to-date', async () => {
    const recentCompletion = new Date().toISOString();
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('fresh-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('fresh-stream', { last_completed_at: recentCompletion }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.upToDate).toEqual([
      { streamName: 'fresh-stream', lastCompletedAt: recentCompletion },
    ]);
    expect(output.scheduled).toEqual([]);
  });

  it('schedules streams whose last completion is past the extraction interval', async () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('old-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('old-stream', { last_completed_at: oldCompletion }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.scheduled).toEqual([
      { streamName: 'old-stream', lastCompletedAt: oldCompletion },
    ]);
  });

  it('respects maxScheduledStreams minus already running', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([
      makeStream('running'),
      makeStream('candidate-1'),
      makeStream('candidate-2'),
    ]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('running', {
        status: TaskStatus.InProgress,
        created_at: new Date().toISOString(),
      }),
    ]);

    const { output } = await handler(makeContext({ maxScheduledStreams: 2 }));

    expect(output.alreadyRunning).toHaveLength(1);
    expect(output.scheduled).toHaveLength(1);
    expect(output.skipped).toHaveLength(1);
  });

  it('handles schedule failures gracefully via Promise.allSettled', async () => {
    mockStreamsClient.listStreams.mockResolvedValue([
      makeStream('will-fail'),
      makeStream('will-succeed'),
    ]);
    mockTaskClient.schedule
      .mockRejectedValueOnce(new Error('schedule error'))
      .mockResolvedValueOnce(undefined);

    const { output } = await handler(makeContext());

    expect(output.failedToSchedule).toEqual([{ streamName: 'will-fail', lastCompletedAt: null }]);
    expect(output.scheduled).toEqual([{ streamName: 'will-succeed', lastCompletedAt: null }]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule KI extraction for stream will-fail')
    );
  });

  it('uses custom extractionIntervalHours from input', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('recent-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('recent-stream', { last_completed_at: twoHoursAgo }),
    ]);

    const { output: withDefault } = await handler(makeContext());
    expect(withDefault.upToDate).toHaveLength(1);

    const { output: withShortInterval } = await handler(
      makeContext({ extractionIntervalHours: 1 })
    );
    expect(withShortInterval.scheduled).toHaveLength(1);
  });

  it('uses failed task last_failed_at for interval calculation', async () => {
    const recentFailure = new Date().toISOString();
    mockStreamsClient.listStreams.mockResolvedValue([makeStream('failed-stream')]);
    mockTaskClient.findByType.mockResolvedValue([
      makeTask('failed-stream', {
        status: TaskStatus.Failed,
        last_failed_at: recentFailure,
        last_completed_at: undefined,
        task: { params: { streamName: 'failed-stream', start: 0, end: 1 }, error: 'some error' },
      }),
    ]);

    const { output } = await handler(makeContext());

    expect(output.upToDate).toEqual([{ streamName: 'failed-stream', lastCompletedAt: null }]);
    expect(output.scheduled).toEqual([]);
  });

  it('returns the resolved connectorId in output', async () => {
    const { output } = await handler(makeContext());

    expect(output.connectorId).toBe('connector-1');
  });

  it('returns settings in output', async () => {
    mockModelSettingsClient.getSettings.mockResolvedValue(
      enabledSettings({ intervalHours: 6, excludedStreamPatterns: 'debug-*' })
    );

    const { output } = await handler(makeContext());

    expect(output.settings).toEqual({
      enabled: true,
      intervalHours: 6,
      excludePatterns: ['debug-*'],
    });
  });
});
