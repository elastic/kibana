/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { classifyStreams, parseExcludePatterns } from './classify_streams';

const STUB_STREAM_FIELDS = {
  description: '',
  updated_at: '2025-01-01T00:00:00Z',
} as const;

const makeExecution = (
  streamName: string,
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  id: `exec-${streamName}`,
  spaceId: 'default',
  isTestRun: false,
  status: ExecutionStatus.COMPLETED,
  startedAt: '2025-01-01T00:00:00Z',
  finishedAt: '2025-01-01T00:05:00Z',
  duration: 300_000,
  error: null,
  context: { inputs: { streamName } },
  ...overrides,
});

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
    runningExecutions: [] as WorkflowExecutionListItemDto[],
    completedExecutions: [] as WorkflowExecutionListItemDto[],
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

  it('treats streams without any execution as never-processed candidates', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('stream-a'), makeStream('stream-b')],
    });

    expect(candidateNames(result)).toEqual(['stream-a', 'stream-b']);
  });

  it('identifies already running (non-terminal) executions', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('running-stream')],
      runningExecutions: [
        makeExecution('running-stream', {
          status: ExecutionStatus.RUNNING,
          finishedAt: '',
        }),
      ],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });

  it('marks recently completed executions as up-to-date', () => {
    const recentCompletion = new Date().toISOString();
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('fresh-stream')],
      completedExecutions: [makeExecution('fresh-stream', { finishedAt: recentCompletion })],
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
      completedExecutions: [makeExecution('old-stream', { finishedAt: oldCompletion })],
    });

    expect(result.candidates).toEqual([
      { streamName: 'old-stream', lastCompletedAt: oldCompletion },
    ]);
  });

  it('places no-execution streams before old-execution streams in candidates', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream'), makeStream('new-stream')],
      completedExecutions: [makeExecution('old-stream', { finishedAt: oldCompletion })],
    });

    expect(candidateNames(result)).toEqual(['new-stream', 'old-stream']);
  });

  it('uses first completed execution per stream (assumes sorted by finishedAt desc)', () => {
    const recent = new Date().toISOString();
    const old = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('stream-a')],
      completedExecutions: [
        makeExecution('stream-a', { id: 'exec-recent', finishedAt: recent }),
        makeExecution('stream-a', { id: 'exec-old', finishedAt: old }),
      ],
    });

    expect(result.upToDate).toEqual([{ streamName: 'stream-a', lastCompletedAt: recent }]);
  });

  it('skips running streams when classifying completed executions', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('running-stream')],
      runningExecutions: [
        makeExecution('running-stream', {
          status: ExecutionStatus.RUNNING,
          finishedAt: '',
        }),
      ],
      completedExecutions: [makeExecution('running-stream', { finishedAt: oldCompletion })],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
    expect(result.upToDate).toEqual([]);
  });
});
