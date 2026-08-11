/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { classifyStreams, filterEligibleStreams, isSupportedStream } from './classify_streams';

const STUB_STREAM_FIELDS = {
  description: '',
  updated_at: '2025-01-01T00:00:00Z',
} as const;

const makeExecution = (
  streamName: string,
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto =>
  ({
    id: `exec-${streamName}`,
    spaceId: '*',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: '2025-01-01T00:00:00Z',
    finishedAt: '2025-01-01T00:05:00Z',
    error: null,
    workflowId: 'streams_ki/onboarding',
    duration: 300000,
    concurrencyGroupKey: `streams-ki-onboarding-${streamName}`,
    ...overrides,
  } as WorkflowExecutionListItemDto);

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

const streamNames = (streams: Streams.all.Definition[]) => streams.map((s) => s.name);

describe('isSupportedStream', () => {
  it('accepts classic and query streams', () => {
    expect(isSupportedStream(makeStream('logs.app'))).toBe(true);
    expect(isSupportedStream(makeStream('my-query', { query: true }))).toBe(true);
  });

  it('rejects definitions that are none of the supported types', () => {
    const bogus = { name: 'weird', type: 'group' } as unknown as Streams.all.Definition;
    expect(isSupportedStream(bogus)).toBe(false);
  });
});

describe('filterEligibleStreams', () => {
  it('includes non-query streams whose name matches the index patterns', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('logs.app'), makeStream('metrics.app')],
      isQueryStreamsEnabled: false,
      indexPatterns: ['logs.*'],
    });

    expect(streamNames(result)).toEqual(['logs.app']);
  });

  it('excludes non-query streams that do not match any index pattern', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('traces.app')],
      isQueryStreamsEnabled: true,
      indexPatterns: ['logs*'],
    });

    expect(result).toEqual([]);
  });

  it('always includes query streams when query streams are enabled, regardless of index patterns', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('my-query', { query: true }), makeStream('logs.app')],
      isQueryStreamsEnabled: true,
      indexPatterns: ['logs*'],
    });

    expect(streamNames(result)).toEqual(['my-query', 'logs.app']);
  });

  it('excludes query streams when query streams are disabled', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('my-query', { query: true }), makeStream('logs.app')],
      isQueryStreamsEnabled: false,
      indexPatterns: ['logs*'],
    });

    expect(streamNames(result)).toEqual(['logs.app']);
  });

  it('matches multiple index patterns', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('logs.app'), makeStream('metrics.app'), makeStream('traces.app')],
      isQueryStreamsEnabled: false,
      indexPatterns: ['logs*', 'metrics*'],
    });

    expect(streamNames(result)).toEqual(['logs.app', 'metrics.app']);
  });

  it('selects nothing when the index patterns are empty and query streams are disabled', () => {
    const result = filterEligibleStreams({
      allStreams: [makeStream('logs.app'), makeStream('metrics.app')],
      isQueryStreamsEnabled: false,
      indexPatterns: [],
    });

    expect(result).toEqual([]);
  });
});

describe('classifyStreams', () => {
  const defaultArgs = {
    allStreams: [] as Streams.all.Definition[],
    executions: [] as WorkflowExecutionListItemDto[],
    intervalHours: 12,
  };

  it('treats query streams as supported candidates', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), makeStream('my-query', { query: true })],
    });

    expect(candidateNames(result)).toEqual(['logs', 'my-query']);
    expect(result.unsupported).toEqual([]);
  });

  it('buckets definitions of an unsupported type into unsupported', () => {
    const bogus = { name: 'weird', type: 'group' } as unknown as Streams.all.Definition;
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), bogus],
    });

    expect(result.unsupported).toEqual(['weird']);
    expect(candidateNames(result)).toEqual(['logs']);
  });

  it('treats streams without an execution as never-processed candidates', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('stream-a'), makeStream('stream-b')],
    });

    expect(candidateNames(result)).toEqual(['stream-a', 'stream-b']);
  });

  it('identifies already running (in-progress) executions', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('running-stream')],
      executions: [
        makeExecution('running-stream', {
          status: ExecutionStatus.RUNNING,
          finishedAt: '',
        }),
      ],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });

  it('treats pending executions as already running', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('pending-stream')],
      executions: [
        makeExecution('pending-stream', {
          status: ExecutionStatus.PENDING,
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
      executions: [makeExecution('fresh-stream', { finishedAt: recentCompletion })],
    });

    expect(result.upToDate).toEqual([
      { streamName: 'fresh-stream', lastCompletedAt: recentCompletion },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('schedules streams whose last execution finished past the extraction interval', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream')],
      executions: [makeExecution('old-stream', { finishedAt: oldCompletion })],
    });

    expect(result.candidates).toEqual([
      { streamName: 'old-stream', lastCompletedAt: oldCompletion },
    ]);
  });

  it('uses finishedAt for failed executions in interval calculation', () => {
    const recentFailure = new Date().toISOString();
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('failed-stream')],
      executions: [
        makeExecution('failed-stream', {
          status: ExecutionStatus.FAILED,
          finishedAt: recentFailure,
        }),
      ],
    });

    expect(result.upToDate).toEqual([
      { streamName: 'failed-stream', lastCompletedAt: recentFailure },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('places no-execution streams before old-execution streams in candidates', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream'), makeStream('new-stream')],
      executions: [makeExecution('old-stream', { finishedAt: oldCompletion })],
    });

    expect(candidateNames(result)).toEqual(['new-stream', 'old-stream']);
  });

  it('orders candidates by oldest onboarding first', () => {
    const finishedTwelveMinAgo = new Date(Date.now() - 12 * 60_000).toISOString();
    const finishedTenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const result = classifyStreams({
      ...defaultArgs,
      intervalHours: 0,
      // Provide executions newest-first (as the API returns them) to prove the
      // candidates are reordered by oldest completion, not left in input order.
      allStreams: [makeStream('recent-stream'), makeStream('older-stream')],
      executions: [
        makeExecution('recent-stream', { finishedAt: finishedTenMinAgo }),
        makeExecution('older-stream', { finishedAt: finishedTwelveMinAgo }),
      ],
    });

    expect(candidateNames(result)).toEqual(['older-stream', 'recent-stream']);
  });
});
