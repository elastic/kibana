/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getAdminCapabilities } from '../../lib/capabilities/__mocks__/ml_capabilities';
import {
  createQueryAnomaliesTool,
  extractReferencedIndices,
  isAllowedMlIndex,
  isMlAnomaliesViewUnavailableError,
  queryUsesMlAnomaliesView,
  resolveParamDates,
  rewriteMlAnomaliesViewQuery,
  validateMlSystemIndexQuery,
} from './query_anomalies';
import { QUERY_ANOMALIES_TOOL_ID } from './tool_ids';

const resolveMlCapabilities = jest.fn().mockResolvedValue(getAdminCapabilities());
const queryAnomaliesTool = createQueryAnomaliesTool(resolveMlCapabilities);

const createEsClientMock = () => ({
  asInternalUser: {
    esql: {
      query: jest.fn().mockResolvedValue({
        columns: [{ name: 'job_id', type: 'keyword' }],
        values: [['my-job']],
      }),
    },
  },
  asCurrentUser: {
    esql: {
      query: jest.fn(),
    },
  },
});

const createContext = (esClient = createEsClientMock()) =>
  ({
    esClient,
    request: {},
  } as any);

describe('extractReferencedIndices', () => {
  it('parses a single FROM index', () => {
    expect(extractReferencedIndices('FROM .ml-anomalies | LIMIT 10')).toEqual(['.ml-anomalies']);
  });

  it('parses a wildcard results index pattern', () => {
    expect(extractReferencedIndices('FROM .ml-anomalies-* | LIMIT 10')).toEqual([
      '.ml-anomalies-*',
    ]);
  });

  it('parses multiple comma-separated FROM indices', () => {
    expect(extractReferencedIndices('FROM .ml-anomalies-*, .ml-config | WHERE true')).toEqual([
      '.ml-anomalies-*',
      '.ml-config',
    ]);
  });

  it('includes LOOKUP JOIN targets', () => {
    expect(
      extractReferencedIndices('FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1')
    ).toEqual(['.ml-config', 'secrets']);
  });

  it('returns empty when FROM is missing', () => {
    expect(extractReferencedIndices('ROW 1')).toEqual([]);
  });
});

describe('isAllowedMlIndex', () => {
  it.each([
    '.ml-anomalies',
    '.ml-anomalies-*',
    '.ml-anomalies-shared',
    '.ml-config',
    '.ml-notifications-*',
    '.ml-annotations-*',
  ])('allows %s', (index) => {
    expect(isAllowedMlIndex(index)).toBe(true);
  });

  it.each(['*', 'logs-*', '.kibana', 'remote:.ml-anomalies-*', '.ml-state'])(
    'rejects %s',
    (index) => {
      expect(isAllowedMlIndex(index)).toBe(false);
    }
  );
});

describe('validateMlSystemIndexQuery', () => {
  it('returns undefined for an allowed query', () => {
    expect(validateMlSystemIndexQuery('FROM .ml-anomalies | LIMIT 10')).toBeUndefined();
  });

  it('allows the materialized view and the wildcard results indices', () => {
    expect(validateMlSystemIndexQuery('FROM .ml-anomalies-* | LIMIT 10')).toBeUndefined();
  });

  it('rejects source-data wildcards', () => {
    expect(validateMlSystemIndexQuery('FROM * METADATA _index | LIMIT 10')).toMatch(
      /disallowed index/
    );
  });

  it('rejects LOOKUP JOIN to a non-ML index', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1')
    ).toMatch(/disallowed index/);
  });

  it('allows LOOKUP JOIN when the target is an allowed ML index', () => {
    expect(
      validateMlSystemIndexQuery(
        'FROM .ml-anomalies-for-specific-job | LOOKUP JOIN .ml-config ON job_id | LIMIT 1'
      )
    ).toBeUndefined();
  });

  it('rejects ENRICH', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config | ENRICH some_policy ON job_id | LIMIT 1')
    ).toMatch(/ENRICH is not permitted/);
  });

  it('ignores ENRICH mentioned only in comments', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config // ENRICH not executed\n| LIMIT 1')
    ).toBeUndefined();
  });
});

describe('queryUsesMlAnomaliesView', () => {
  it('detects the exact materialized view', () => {
    expect(queryUsesMlAnomaliesView('FROM .ml-anomalies | LIMIT 10')).toBe(true);
  });

  it('does not treat the wildcard or per-job indices as the view', () => {
    expect(queryUsesMlAnomaliesView('FROM .ml-anomalies-* | LIMIT 10')).toBe(false);
    expect(queryUsesMlAnomaliesView('FROM .ml-anomalies-shared | LIMIT 10')).toBe(false);
  });

  it('does not flag unrelated ML indices', () => {
    expect(queryUsesMlAnomaliesView('FROM .ml-config | LIMIT 10')).toBe(false);
  });
});

describe('rewriteMlAnomaliesViewQuery', () => {
  it('rewrites the view to the wildcard, injects score EVAL, and maps event.ingested to timestamp', () => {
    const rewritten = rewriteMlAnomaliesViewQuery(`FROM .ml-anomalies
| WHERE result_type == "record"
  AND score >= ?min_score
  AND \`event.ingested\` >= ?start_time
  AND event.ingested <= ?end_time
| KEEP job_id, timestamp, \`event.ingested\`, score, initial_score`);

    expect(rewritten).toContain('FROM .ml-anomalies-*');
    expect(rewritten).not.toMatch(/FROM \.ml-anomalies\n/);
    // EVAL must appear before the WHERE clause
    expect(rewritten).toMatch(/EVAL score = COALESCE\(record_score/);
    expect(rewritten).toMatch(/initial_score = COALESCE\(initial_record_score/);
    expect(rewritten.indexOf('EVAL')).toBeLessThan(rewritten.indexOf('WHERE'));
    expect(rewritten).not.toContain('event.ingested');
    expect(rewritten).toContain('AND timestamp >= ?start_time');
    expect(rewritten).toContain('AND timestamp <= ?end_time');
    expect(rewritten).toContain('KEEP job_id, timestamp');
    expect(rewritten).not.toMatch(/timestamp,\s*timestamp/);
  });

  it('does not rewrite .ml-anomalies-* or .ml-anomalies-shared', () => {
    expect(rewriteMlAnomaliesViewQuery('FROM .ml-anomalies-* | LIMIT 10')).toBe(
      'FROM .ml-anomalies-* | LIMIT 10'
    );
    expect(rewriteMlAnomaliesViewQuery('FROM .ml-anomalies-shared | LIMIT 10')).toBe(
      'FROM .ml-anomalies-shared | LIMIT 10'
    );
  });
});

describe('resolveParamDates', () => {
  it('leaves non-date-math values unchanged', () => {
    expect(resolveParamDates({ job_id_pattern: 'web-*', min_score: 50, flag: true })).toEqual({
      job_id_pattern: 'web-*',
      min_score: 50,
      flag: true,
    });
  });

  it('converts "now" to an ISO 8601 string', () => {
    const before = Date.now();
    const result = resolveParamDates({ end_time: 'now' });
    const after = Date.now();
    const resolved = new Date(result.end_time as string).getTime();
    expect(resolved).toBeGreaterThanOrEqual(before);
    expect(resolved).toBeLessThanOrEqual(after);
  });

  it('converts "now-2y" to an approximate ISO 8601 string', () => {
    const result = resolveParamDates({ start_time: 'now-2y' });
    const resolved = new Date(result.start_time as string).getTime();
    const twoYearsAgo = Date.now() - 2 * 31_536_000_000;
    // Allow ±5 s for test execution time
    expect(Math.abs(resolved - twoYearsAgo)).toBeLessThan(5_000);
  });

  it('converts "now-6M" correctly', () => {
    const result = resolveParamDates({ start_time: 'now-6M' });
    const resolved = new Date(result.start_time as string).getTime();
    const sixMonthsAgo = Date.now() - 6 * 2_592_000_000;
    expect(Math.abs(resolved - sixMonthsAgo)).toBeLessThan(5_000);
  });

  it('rounds now-1d/d down to the start of the previous UTC day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-15T15:30:45.000Z'));
    try {
      expect(resolveParamDates({ t: 'now/d' }).t).toBe('2024-03-15T00:00:00.000Z');
      expect(resolveParamDates({ t: 'now-1d/d' }).t).toBe('2024-03-14T00:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('isMlAnomaliesViewUnavailableError', () => {
  it('matches unknown-index failures', () => {
    expect(isMlAnomaliesViewUnavailableError(new Error('Unknown index [.ml-anomalies]'))).toBe(
      true
    );
    expect(isMlAnomaliesViewUnavailableError(new Error('index_not_found_exception'))).toBe(true);
  });

  it('does not match unrelated failures', () => {
    expect(isMlAnomaliesViewUnavailableError(new Error('parsing_exception'))).toBe(false);
  });
});

describe('queryAnomaliesTool', () => {
  it('has the correct ID and type', () => {
    expect(queryAnomaliesTool.id).toBe(QUERY_ANOMALIES_TOOL_ID);
    expect(queryAnomaliesTool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    expect(queryAnomaliesTool.description).toBeTruthy();
  });

  it('does not teach calling with an empty params object or missing query', () => {
    // Models copy description examples; an empty params object causes {} / missing-query calls.
    expect(queryAnomaliesTool.description).not.toMatch(/"params"\s*:\s*\{\s*\}/);
    // Must front-load the "read before call" requirement and forbid empty calls.
    expect(queryAnomaliesTool.description).toMatch(/never call this tool without `query`/i);
    expect(queryAnomaliesTool.description).toMatch(/omit the `params` field entirely/i);
    // Must list the referenced ES|QL files explicitly so agents know where to look.
    expect(queryAnomaliesTool.description).toMatch(/esql-read-queries/i);
    expect(queryAnomaliesTool.description).toMatch(/esql-metadata-queries/i);
    expect(queryAnomaliesTool.description).toMatch(/esql-score-queries/i);
    expect(queryAnomaliesTool.description).toMatch(/FROM \.ml-anomalies /);
    expect(queryAnomaliesTool.description).toMatch(/materialized view/i);
    expect(queryAnomaliesTool.description).toMatch(/causes/);
    expect(queryAnomaliesTool.description).toMatch(/older ES versions/i);
  });

  describe('handler', () => {
    it('executes ES|QL as the internal user for allowed .ml indices', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query = `FROM .ml-config
| WHERE job_type == "anomaly_detector"
| STATS job_count = COUNT(*),
        job_ids = VALUES(job_id)`;

      const result = await queryAnomaliesTool.handler({ query, limit: 100 }, context);

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('FROM .ml-config'),
          drop_null_columns: true,
          allow_partial_results: true,
        })
      );
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as { results: Array<{ type: string; data?: unknown }> };
      expect(standardResult.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ToolResultType.query }),
          expect.objectContaining({
            type: ToolResultType.esqlResults,
            data: expect.objectContaining({
              columns: [{ name: 'job_id', type: 'keyword' }],
              values: [['my-job']],
            }),
          }),
        ])
      );
    });

    it('passes bound params through to ES|QL', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query =
        'FROM .ml-anomalies | WHERE job_id LIKE ?job_id_pattern AND score >= ?min_score';

      await queryAnomaliesTool.handler(
        { query, params: { job_id_pattern: 'web-*', min_score: 75 }, limit: 100 },
        context
      );

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [{ job_id_pattern: 'web-*' }, { min_score: 75 }],
        })
      );
    });

    it('resolves date math params to ISO 8601 before passing to ES|QL', async () => {
      const tool = createQueryAnomaliesTool(resolveMlCapabilities);
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query =
        'FROM .ml-config | WHERE job_type == "anomaly_detector" AND timestamp >= ?start_time AND timestamp <= ?end_time | LIMIT 10';

      await tool.handler(
        { query, params: { start_time: 'now-2y', end_time: 'now' }, limit: 10 },
        context
      );

      const calledParams = esClient.asInternalUser.esql.query.mock.calls[0][0].params as Array<
        Record<string, unknown>
      >;
      const startValue = calledParams.find((p) => 'start_time' in p)?.start_time as string;
      const endValue = calledParams.find((p) => 'end_time' in p)?.end_time as string;
      expect(startValue).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(endValue).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(startValue).getTime()).toBeLessThan(new Date(endValue).getTime());
    });

    it('rejects queries against non-ML indices without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        { query: 'FROM logs-* | LIMIT 10', limit: 100 },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/disallowed index/);
    });

    it('rejects LOOKUP JOIN to non-ML indices without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        {
          query: 'FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1',
          limit: 100,
        },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/disallowed index/);
    });

    it('rejects ENRICH without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        {
          query: 'FROM .ml-config | ENRICH some_policy ON job_id | LIMIT 1',
          limit: 100,
        },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/ENRICH is not permitted/);
    });

    it('returns an error result when ES|QL throws', async () => {
      const esClient = createEsClientMock();
      esClient.asInternalUser.esql.query.mockRejectedValue(new Error('parsing_exception'));
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        { query: 'FROM .ml-config | LIMIT 1', limit: 100 },
        context
      );

      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'Error executing ES|QL query: parsing_exception'
      );
    });

    it('keeps FROM .ml-anomalies when the materialized view probe succeeds', async () => {
      const tool = createQueryAnomaliesTool(resolveMlCapabilities);
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query =
        'FROM .ml-anomalies | WHERE result_type == "record" AND score >= ?min_score AND `event.ingested` >= ?start_time';

      await tool.handler(
        { query, params: { min_score: 50, start_time: '2024-01-01T00:00:00Z' }, limit: 100 },
        context
      );

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledTimes(2);
      expect(esClient.asInternalUser.esql.query.mock.calls[0][0].query).toMatch(
        /FROM \.ml-anomalies\s*\n\| LIMIT 0/
      );
      // View is available — query must not be rewritten (score / event.ingested kept as-is).
      const executedQuery = esClient.asInternalUser.esql.query.mock.calls[1][0].query as string;
      expect(executedQuery).toContain('FROM .ml-anomalies |');
      expect(executedQuery).toContain('score >=');
      expect(executedQuery).toContain('`event.ingested`');
      expect(executedQuery).not.toContain('EVAL score = COALESCE');
    });

    it('falls back to .ml-anomalies-* when the materialized view is unavailable', async () => {
      const tool = createQueryAnomaliesTool(resolveMlCapabilities);
      const esClient = createEsClientMock();
      esClient.asInternalUser.esql.query
        .mockRejectedValueOnce(new Error('Unknown index [.ml-anomalies]'))
        .mockResolvedValueOnce({
          columns: [{ name: 'job_id', type: 'keyword' }],
          values: [['my-job']],
        });
      const context = createContext(esClient);
      const query = `FROM .ml-anomalies
| WHERE result_type == "record"
  AND score >= ?min_score
  AND \`event.ingested\` >= ?start_time`;

      const result = await tool.handler(
        { query, params: { min_score: 50, start_time: '2024-01-01T00:00:00Z' }, limit: 50 },
        context
      );

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledTimes(2);
      const executedQuery = esClient.asInternalUser.esql.query.mock.calls[1][0].query as string;
      expect(executedQuery).toContain('FROM .ml-anomalies-*');
      expect(executedQuery).not.toMatch(/FROM \.ml-anomalies\n/);
      // Score EVAL must be injected before the WHERE clause.
      expect(executedQuery).toContain('EVAL score = COALESCE(record_score');
      expect(executedQuery.indexOf('EVAL')).toBeLessThan(executedQuery.indexOf('WHERE'));
      expect(executedQuery).toContain('timestamp >= ?start_time');
      expect(executedQuery).not.toContain('event.ingested');

      const standardResult = result as {
        results: Array<{ type: string; data?: { esql?: string } }>;
      };
      expect(standardResult.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: ToolResultType.query,
            data: expect.objectContaining({
              esql: expect.stringContaining('FROM .ml-anomalies-*'),
            }),
          }),
        ])
      );
    });

    it('does not probe when the query already uses .ml-anomalies-*', async () => {
      const tool = createQueryAnomaliesTool(resolveMlCapabilities);
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      await tool.handler(
        {
          query: 'FROM .ml-anomalies-* | WHERE result_type == "model_plot" | LIMIT 10',
          limit: 100,
        },
        context
      );

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledTimes(1);
      expect(esClient.asInternalUser.esql.query.mock.calls[0][0].query).toContain(
        'FROM .ml-anomalies-*'
      );
    });
  });
});
