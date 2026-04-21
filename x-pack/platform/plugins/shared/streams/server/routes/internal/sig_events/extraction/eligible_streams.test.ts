/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus, type Streams } from '@kbn/streams-schema';
import type { PersistedTask } from '../../../../lib/tasks/types';
import type { FeaturesIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/features_identification';
import { classifyStreams, parseExcludePatterns } from './classify_streams';

const STUB_STREAM_FIELDS = {
  description: '',
  updated_at: '2025-01-01T00:00:00Z',
} as const;

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

const makeStream = (name: string, opts?: { query: boolean }): Streams.all.Definition =>
  opts?.query
    ? {
        name,
        type: 'query' as const,
        query: { esql: `FROM ${name}`, view: name },
        ...STUB_STREAM_FIELDS,
      }
    : {
        name,
        type: 'classic' as const,
        ingest: {
          processing: { steps: [], updated_at: '' },
          lifecycle: { inherit: {} },
          settings: {},
          failure_store: { disabled: {} },
          classic: {},
        },
        ...STUB_STREAM_FIELDS,
      };

const candidateNames = (result: ReturnType<typeof classifyStreams>) =>
  result.candidates.map((c) => c.streamName);

describe('parseExcludePatterns', () => {
  it('splits comma-separated patterns and trims whitespace', () => {
    expect(parseExcludePatterns('debug-*, test-* , logs-*')).toEqual([
      'debug-*',
      'test-*',
      'logs-*',
    ]);
  });

  it('returns empty array for undefined', () => {
    expect(parseExcludePatterns(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseExcludePatterns('')).toEqual([]);
  });
});

describe('classifyStreams', () => {
  const defaultArgs = {
    allStreams: [] as ReturnType<typeof makeStream>[],
    sortedTasks: [] as TaskForTest[],
    excludedStreamPatterns: '',
    intervalHours: 12,
  };

  it('skips unsupported stream types and reports them', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), makeStream('my-query', { query: true })],
    });

    expect(candidateNames(result)).toEqual(['logs']);
    expect(result.unsupported).toEqual(['my-query']);
  });

  it('excludes streams matching exclude patterns', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), makeStream('debug-app'), makeStream('test-data')],
      excludedStreamPatterns: 'debug-*, test-*',
    });

    expect(result.excluded).toEqual(['debug-app', 'test-data']);
    expect(candidateNames(result)).toEqual(['logs']);
  });

  it('treats streams without a task as never-processed candidates', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('stream-a'), makeStream('stream-b')],
    });

    expect(candidateNames(result)).toEqual(['stream-a', 'stream-b']);
  });

  it('identifies already running (in-progress) tasks', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('running-stream')],
      sortedTasks: [
        makeTask('running-stream', {
          status: TaskStatus.InProgress,
          created_at: new Date().toISOString(),
        }),
      ],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });

  it('treats BeingCanceled tasks as already running', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('canceling-stream')],
      sortedTasks: [
        makeTask('canceling-stream', {
          status: TaskStatus.BeingCanceled,
          created_at: new Date().toISOString(),
        }),
      ],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });

  it('marks recently completed tasks as up-to-date', () => {
    const recentCompletion = new Date().toISOString();
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('fresh-stream')],
      sortedTasks: [makeTask('fresh-stream', { last_completed_at: recentCompletion })],
    });

    expect(result.upToDate).toEqual([
      { streamName: 'fresh-stream', lastCompletedAt: recentCompletion },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('schedules streams whose last completion is past the extraction interval', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream')],
      sortedTasks: [makeTask('old-stream', { last_completed_at: oldCompletion })],
    });

    expect(result.candidates).toEqual([
      { streamName: 'old-stream', lastCompletedAt: oldCompletion },
    ]);
  });

  it('uses failed task last_failed_at for interval calculation', () => {
    const recentFailure = new Date().toISOString();
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('failed-stream')],
      sortedTasks: [
        makeTask('failed-stream', {
          status: TaskStatus.Failed,
          last_failed_at: recentFailure,
          last_completed_at: undefined,
          task: { params: { streamName: 'failed-stream', start: 0, end: 1 }, error: 'some error' },
        }),
      ],
    });

    expect(result.upToDate).toEqual([{ streamName: 'failed-stream', lastCompletedAt: null }]);
    expect(result.candidates).toEqual([]);
  });

  it('places no-task streams before old-task streams in candidates', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream'), makeStream('new-stream')],
      sortedTasks: [makeTask('old-stream', { last_completed_at: oldCompletion })],
    });

    expect(candidateNames(result)).toEqual(['new-stream', 'old-stream']);
  });
});
