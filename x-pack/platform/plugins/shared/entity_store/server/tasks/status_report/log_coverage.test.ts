/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { userEntityDefinition } from '../../../common/domain/definitions/user';
import {
  buildLogCoverageSampleQuery,
  collectLogCoverage,
  computeSampleRate,
  DEFAULT_LOG_COVERAGE_TARGET_DOCS,
  MIN_LOG_COVERAGE_TARGET_DOCS,
  nextTargetDocs,
} from './log_coverage';

describe('computeSampleRate', () => {
  it('aims for the target number of documents', () => {
    expect(computeSampleRate(50_000, 1_000_000)).toBe(0.05);
  });

  it('reads everything when the window is smaller than the target', () => {
    expect(computeSampleRate(50_000, 10_000)).toBe(1);
    expect(computeSampleRate(50_000, 0)).toBe(1);
  });

  it('never goes below the minimum rate', () => {
    expect(computeSampleRate(50_000, 10_000_000_000)).toBe(0.0001);
  });
});

describe('nextTargetDocs', () => {
  it('halves after a timeout, down to a floor', () => {
    expect(nextTargetDocs(50_000, 'timed_out')).toBe(25_000);
    expect(nextTargetDocs(1_500, 'timed_out')).toBe(MIN_LOG_COVERAGE_TARGET_DOCS);
  });

  it('grows after a success, up to the default', () => {
    expect(nextTargetDocs(10_000, 'complete')).toBe(15_000);
    expect(nextTargetDocs(40_000, 'complete')).toBe(DEFAULT_LOG_COVERAGE_TARGET_DOCS);
  });

  it('keeps the size for the other outcomes', () => {
    (['partial', 'failed', 'skipped'] as const).forEach((outcome) => {
      expect(nextTargetDocs(12_345, outcome)).toBe(12_345);
    });
  });
});

describe('buildLogCoverageSampleQuery', () => {
  const build = (sampleRate: number, excludedUserNames: string[] = []) =>
    buildLogCoverageSampleQuery({
      indexPatterns: ['logs-*', 'extra-*'],
      sampleRate,
      excludedUserNames,
    });

  it('samples right after the window filter, before any EVAL', () => {
    const query = build(0.05);

    expect(query.startsWith('SET unmapped_fields="nullify";')).toBe(true);
    expect(query).toContain('FROM logs-*, extra-*');
    expect(query).toContain('@timestamp >= NOW() - 12 hours');
    expect(query.indexOf('SAMPLE 0.05')).toBeGreaterThan(query.indexOf('@timestamp >='));
    expect(query.indexOf('SAMPLE 0.05')).toBeLessThan(query.indexOf('| EVAL'));
  });

  it('leaves SAMPLE out when the whole window is read', () => {
    expect(build(1)).not.toContain('SAMPLE');
  });

  it('derives entity.source and entity.namespace and groups by source', () => {
    const query = build(0.5);

    expect(query).toContain('entity.source =');
    expect(query).toContain('entity.namespace =');
    expect(query).toContain('BY entity.source');
    expect(query).toContain('LIMIT 30');
  });

  it('applies the excluded user names to the local user rule', () => {
    expect(build(0.5, ['svc_backup'])).toContain('svc_backup');
    expect(build(0.5)).not.toContain('svc_backup');
  });

  it('keeps the creation rule in line with the user definition', () => {
    // The probe repeats the creation arms of `postAggFilter` (local namespace or asset events).
    const postAggFilter = JSON.stringify(userEntityDefinition.extraction.postAggFilter);
    expect(postAggFilter).toContain('"entity.namespace"');
    expect(postAggFilter).toContain('"local"');
    expect(postAggFilter).toContain('"event.kind"');
    expect(postAggFilter).toContain('"asset"');

    const query = build(0.5);
    expect(query).toContain('matchesCreationRule = COUNT(CASE(');
    expect(query).toContain('"local"');
    expect(query).toContain('"asset"');
  });
});

describe('collectLogCoverage', () => {
  const logger = loggerMock.create();
  const signal = new AbortController().signal;
  const FAR_DEADLINE = () => Date.now() + 9 * 60_000;

  const columns = (names: string[]) => names.map((name) => ({ name, type: 'long' }));
  const sampleColumns = columns([
    'sampledDocs',
    'withUserName',
    'withUserEmail',
    'withUserId',
    'withHostId',
    'withHostName',
    'matchesCreationRule',
    'entity.source',
  ]);

  const collect = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
    overrides: Partial<Parameters<typeof collectLogCoverage>[0]> = {}
  ) =>
    collectLogCoverage({
      esClient,
      logger,
      getIndexPatterns: async () => ['logs-*'],
      excludedUserNames: [],
      targetDocs: 50_000,
      signal,
      deadline: FAR_DEADLINE(),
      ...overrides,
    });

  const clientWith = (
    handler: (query: string) => unknown,
    { onSignal }: { onSignal?: boolean } = {}
  ) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(((
      { query }: { query: string },
      options?: { signal?: AbortSignal }
    ) => {
      const result = handler(query);
      if (result === 'hang' && onSignal) {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }
      return Promise.resolve(result);
    }) as never);
    return esClient;
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips when there are no index patterns', async () => {
    const esClient = clientWith(() => ({}));

    const { event, nextTargetDocs: next } = await collect(esClient, {
      getIndexPatterns: async () => [],
    });

    expect(event).toEqual(expect.objectContaining({ outcome: 'skipped', windowHours: 12 }));
    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(next).toBe(50_000);
  });

  it('reports an empty window without sampling', async () => {
    const esClient = clientWith(() => ({ columns: columns(['totalDocs']), values: [[0]] }));

    const { event } = await collect(esClient);

    expect(event).toEqual(
      expect.objectContaining({ outcome: 'complete', totalDocs: 0, sampledDocs: 0, sources: [] })
    );
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('reports partial, not complete, when a partial count finds no documents', async () => {
    const esClient = clientWith(() => ({
      columns: columns(['totalDocs']),
      values: [[0]],
      is_partial: true,
    }));

    const { event, nextTargetDocs: next } = await collect(esClient, { targetDocs: 20_000 });

    expect(event).toEqual(expect.objectContaining({ outcome: 'partial', totalDocs: 0 }));
    expect(next).toBe(20_000);
  });

  it('stops waiting for the index patterns after 10s', async () => {
    jest.useFakeTimers();
    const esClient = clientWith(() => ({}));

    const pending = collect(esClient, { getIndexPatterns: () => new Promise(() => {}) });
    await jest.advanceTimersByTimeAsync(10_001);
    const { event } = await pending;

    expect(event.outcome).toBe('timed_out');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('skips without resolving the index patterns when the task is aborted', async () => {
    const esClient = clientWith(() => ({}));
    const controller = new AbortController();
    controller.abort();
    const getIndexPatterns = jest.fn(async () => ['logs-*']);

    const { event } = await collect(esClient, { getIndexPatterns, signal: controller.signal });

    expect(event.outcome).toBe('skipped');
    expect(getIndexPatterns).not.toHaveBeenCalled();
  });

  it('reports partial when Elasticsearch returns partial results', async () => {
    const esClient = clientWith((query) =>
      query.includes('totalDocs')
        ? { columns: columns(['totalDocs']), values: [[1000]] }
        : {
            columns: sampleColumns,
            values: [[10, 9, 1, 2, 3, 4, 5, 'okta']],
            is_partial: true,
          }
    );

    const { event } = await collect(esClient);

    expect(event.outcome).toBe('partial');
    expect(event.sources).toHaveLength(1);
  });

  it('reports failed and keeps what it knew when the sample fails', async () => {
    const esClient = clientWith((query) => {
      if (query.includes('totalDocs'))
        return { columns: columns(['totalDocs']), values: [[1_000_000]] };
      throw new Error('boom');
    });

    const { event, nextTargetDocs: next } = await collect(esClient);

    expect(event).toEqual(
      expect.objectContaining({ outcome: 'failed', totalDocs: 1_000_000, sampleRate: 0.05 })
    );
    expect(event.sources).toBeUndefined();
    expect(next).toBe(50_000);
  });

  it('reports failed when the index patterns cannot be resolved', async () => {
    const esClient = clientWith(() => ({}));

    const { event } = await collect(esClient, {
      getIndexPatterns: async () => {
        throw new Error('no data view');
      },
    });

    expect(event.outcome).toBe('failed');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no data view'));
  });

  it('times out the count after 10s and halves the next sample', async () => {
    jest.useFakeTimers();
    const esClient = clientWith(() => 'hang', { onSignal: true });

    const pending = collect(esClient);
    await jest.advanceTimersByTimeAsync(10_001);
    const { event, nextTargetDocs: next } = await pending;

    expect(event.outcome).toBe('timed_out');
    expect(event.totalDocs).toBeUndefined();
    expect(next).toBe(25_000);
  });

  it('times out the sample after 30s, reports the totals and halves the next sample', async () => {
    jest.useFakeTimers();
    const esClient = clientWith(
      (query) =>
        query.includes('totalDocs')
          ? { columns: columns(['totalDocs']), values: [[2_000_000]] }
          : 'hang',
      { onSignal: true }
    );

    const pending = collect(esClient);
    await jest.advanceTimersByTimeAsync(30_001);
    const { event, nextTargetDocs: next } = await pending;

    expect(event).toEqual(
      expect.objectContaining({ outcome: 'timed_out', totalDocs: 2_000_000, sampleRate: 0.025 })
    );
    expect(next).toBe(25_000);
  });

  it('skips the probe when the task deadline is too close', async () => {
    const esClient = clientWith(() => ({}));

    const { event } = await collect(esClient, { deadline: Date.now() + 1_000 });

    expect(event.outcome).toBe('skipped');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });
});
