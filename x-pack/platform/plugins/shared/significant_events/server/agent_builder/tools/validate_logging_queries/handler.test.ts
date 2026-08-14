/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  OVER_CAPTURE_CEILING,
  validateLoggingQueriesHandler,
  type GrepCandidateInput,
  type GrepValidationStatus,
} from './handler';

const STATS_COLUMNS = [
  { name: 'hits', type: 'long' },
  { name: 'covers_evidence', type: 'long' },
];
const TOTAL_COLUMNS = [{ name: 'total', type: 'long' }];
const SAMPLE_COLUMNS = [
  { name: 'file.path', type: 'keyword' },
  { name: 'line.number', type: 'long' },
];

const isTotalQuery = (query: string): boolean => query.includes('STATS total = COUNT(*)');
const isStatsQuery = (query: string): boolean => query.includes('STATS hits = COUNT(*)');
const isSampleQuery = (query: string): boolean => query.includes('LIMIT 3');

const REPO_TOTAL_LINES = 108873;

const candidate = (
  regex: string,
  path = 'lib/realtime/logs.ex',
  line = 21
): GrepCandidateInput => ({
  regex,
  evidence: { path, line },
});

describe('validateLoggingQueriesHandler', () => {
  const logger = loggingSystemMock.createLogger();

  const setupTotalMock = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
    total = REPO_TOTAL_LINES
  ) => {
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isTotalQuery(req.query)) {
        return { columns: TOTAL_COLUMNS, values: [[total]] };
      }
      return { columns: [], values: [] };
    }) as unknown as typeof esClient.esql.query);
  };

  describe('all 6 statuses (INV-002)', () => {
    it('classifies a covering, in-budget grep as ok', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          return { columns: STATS_COLUMNS, values: [[179, 1]] };
        }
        if (isSampleQuery(req.query)) {
          return {
            columns: SAMPLE_COLUMNS,
            values: [
              ['lib/realtime/logs.ex', 21],
              ['lib/realtime_web/channels/realtime_channel/logging.ex', 21],
            ],
          };
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*log_error[(].*')],
        logger,
      });

      expect(output.repo_total_lines).toBe(REPO_TOTAL_LINES);
      expect(output.results).toHaveLength(1);
      const result = output.results[0];
      expect(result.status).toBe('ok');
      expect(result.pass).toBe(true);
      expect(result.hits).toBe(179);
      expect(result.hit_ratio).toBeCloseTo(179 / REPO_TOTAL_LINES, 6);
      expect(result.covers_evidence).toBe(true);
      expect(result.error).toBeNull();
      // sample is fetched for ok.
      expect(result.sample).toEqual([
        'lib/realtime/logs.ex:21',
        'lib/realtime_web/channels/realtime_channel/logging.ex:21',
      ]);
    });

    it('classifies an unanchored grep with zero hits as zero_hits (error null)', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      setupTotalMock(esClient);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('log_error[(].*')], // unanchored
        logger,
      });

      const result = output.results[0];
      expect(result.status).toBe('zero_hits');
      expect(result.pass).toBe(false);
      expect(result.hits).toBe(0);
      expect(result.covers_evidence).toBe(false);
      // INV-002: zero hits has a NULL error, distinct from invalid_syntax.
      expect(result.error).toBeNull();
      expect(result.sample).toEqual([]);
    });

    it('classifies a JS-escaped grep that matches nothing as zero_hits', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      setupTotalMock(esClient);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('log_error\\([^\\)]+\\)')], // JS escaping
        logger,
      });

      expect(output.results[0].status).toBe('zero_hits');
      expect(output.results[0].error).toBeNull();
    });

    it('classifies an over-broad grep as over_capture (pass false, error null)', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          // 1695 hits = 1.6% of the repo, covers_evidence true by accident.
          return { columns: STATS_COLUMNS, values: [[1695, 1]] };
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*log.*')],
        logger,
      });

      const result = output.results[0];
      expect(result.status).toBe('over_capture');
      expect(result.pass).toBe(false);
      expect(result.hit_ratio).toBeGreaterThanOrEqual(OVER_CAPTURE_CEILING);
      expect(result.covers_evidence).toBe(true);
      expect(result.error).toBeNull();
      // sample is NOT fetched for over_capture.
      expect(result.sample).toEqual([]);
    });

    it('classifies a grep that hits but misses its evidence as evidence_missed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          return { columns: STATS_COLUMNS, values: [[500, 0]] };
        }
        if (isSampleQuery(req.query)) {
          return { columns: SAMPLE_COLUMNS, values: [['src/other.ex', 5]] };
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*wrong_thing.*')],
        logger,
      });

      const result = output.results[0];
      expect(result.status).toBe('evidence_missed');
      expect(result.pass).toBe(false);
      expect(result.hits).toBe(500);
      expect(result.covers_evidence).toBe(false);
      expect(result.error).toBeNull();
      // sample IS fetched for evidence_missed.
      expect(result.sample).toEqual(['src/other.ex:5']);
    });

    it('classifies a malformed RLIKE (parsing_exception) as invalid_syntax (INV-002)', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          throw new errors.ResponseError({
            body: {
              error: {
                type: 'parsing_exception',
                reason: "expected ']' at position 1",
              },
            },
            statusCode: 400,
            warnings: [],
            headers: {},
            meta: {} as never,
          });
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*log_error[(.*')], // unbalanced bracket
        logger,
      });

      const result = output.results[0];
      expect(result.status).toBe('invalid_syntax');
      expect(result.pass).toBe(false);
      // INV-002: error is populated, distinct from zero_hits where error is null.
      expect(result.error).toBe("expected ']' at position 1");
      expect(result.covers_evidence).toBe(false);
      expect(result.sample).toEqual([]);
    });

    it('classifies a transport failure as query_failed (INV-002)', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          throw new Error('connection reset');
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*log_error[(].*')],
        logger,
      });

      const result = output.results[0];
      expect(result.status).toBe('query_failed');
      expect(result.pass).toBe(false);
      expect(result.error).toBe('connection reset');
      expect(result.covers_evidence).toBe(false);
    });

    it('exercises every status in one batch (full INV-002 coverage)', async () => {
      const statsByRegex: Record<
        string,
        { hits: number; covers: number } | 'throw-parse' | 'throw-transport'
      > = {
        '.*log_error[(].*': { hits: 179, covers: 1 }, // ok
        'log_error[(].*': { hits: 0, covers: 0 }, // zero_hits
        '.*log.*': { hits: 1695, covers: 1 }, // over_capture
        '.*wrong_thing.*': { hits: 500, covers: 0 }, // evidence_missed
        '.*log_error[(.*': 'throw-parse', // invalid_syntax
        '.*transport_fail.*': 'throw-transport', // query_failed
      };

      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.esql.query.mockImplementation((async (req: { query: string }) => {
        if (isTotalQuery(req.query)) {
          return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
        }
        if (isStatsQuery(req.query)) {
          const params = (req as { params?: Array<Record<string, unknown>> }).params ?? [];
          const regex = String(params.find((p) => 'regex' in p)?.regex ?? '');
          const outcome = statsByRegex[regex];
          if (outcome === 'throw-parse') {
            throw new errors.ResponseError({
              body: {
                error: { type: 'parsing_exception', reason: 'bad' },
              },
              statusCode: 400,
              warnings: [],
              headers: {},
              meta: {} as never,
            });
          }
          if (outcome === 'throw-transport') {
            throw new Error('connection reset');
          }
          if (outcome) {
            return { columns: STATS_COLUMNS, values: [[outcome.hits, outcome.covers]] };
          }
          return { columns: STATS_COLUMNS, values: [[0, 0]] };
        }
        if (isSampleQuery(req.query)) {
          return { columns: SAMPLE_COLUMNS, values: [['lib/x.ex', 1]] };
        }
        return { columns: [], values: [] };
      }) as unknown as typeof esClient.esql.query);

      const output = await validateLoggingQueriesHandler({
        esClient,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: Object.keys(statsByRegex).map((r) => candidate(r)),
        logger,
      });

      const statuses = output.results.map((r) => r.status);
      expect(new Set(statuses)).toEqual(
        new Set<GrepValidationStatus>([
          'ok',
          'zero_hits',
          'over_capture',
          'evidence_missed',
          'invalid_syntax',
          'query_failed',
        ])
      );
    });
  });

  it('uses the parameterised ?regex binding (no string interpolation)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    setupTotalMock(esClient);

    await validateLoggingQueriesHandler({
      esClient,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    const statsCall = esClient.esql.query.mock.calls
      .map(([{ query, params }]) => ({ query, params }))
      .find(({ query }) => isStatsQuery(query));
    expect(statsCall).toBeDefined();
    expect(statsCall!.query).toContain('line.content RLIKE ?regex');
    expect(statsCall!.query).toContain('file.path == ?ev_path');
    expect(statsCall!.query).toContain('line.number == ?ev_line');
    expect(statsCall!.params).toContainEqual({ regex: '.*log_error[(].*' });
    expect(statsCall!.params).toContainEqual({ ev_path: 'lib/realtime/logs.ex' });
    expect(statsCall!.params).toContainEqual({ ev_line: 21 });
  });

  it('scopes by git.commit in snapshot mode by default and JOINs the refs lookup index (INV-004)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    setupTotalMock(esClient);

    await validateLoggingQueriesHandler({
      esClient,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    for (const [{ query, params }] of esClient.esql.query.mock.calls) {
      expect(query).toContain('update_mode == "snapshot"');
      expect(query).toContain('LOOKUP JOIN sourcerer-v1-refs ON git.ref_key');
      expect(query).toContain('git.commit IS NOT NULL');
      expect(params).toContainEqual({ git_ref_key: '' });
    }
  });

  it('scopes by git.ref_key in incremental mode when gitRefKey is set', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isTotalQuery(req.query)) {
        return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
      }
      if (isStatsQuery(req.query)) {
        return { columns: STATS_COLUMNS, values: [[179, 1]] };
      }
      if (isSampleQuery(req.query)) {
        return { columns: SAMPLE_COLUMNS, values: [['lib/realtime/logs.ex', 21]] };
      }
      return { columns: [], values: [] };
    }) as unknown as typeof esClient.esql.query);

    const output = await validateLoggingQueriesHandler({
      esClient,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      gitRefKey: 'supabase/realtime@main',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    expect(output.results[0].status).toBe('ok');
    expect(output.repo_total_lines).toBe(REPO_TOTAL_LINES);
    for (const [{ query, params }] of esClient.esql.query.mock.calls) {
      expect(query).toContain('update_mode == "incremental"');
      expect(params).toContainEqual({ git_ref_key: 'supabase/realtime@main' });
    }
  });

  it('honours a custom over-capture ceiling', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isTotalQuery(req.query)) {
        return { columns: TOTAL_COLUMNS, values: [[REPO_TOTAL_LINES]] };
      }
      if (isStatsQuery(req.query)) {
        // 179 hits = 0.16%, below the default ceiling but above 0.001.
        return { columns: STATS_COLUMNS, values: [[179, 1]] };
      }
      return { columns: [], values: [] };
    }) as unknown as typeof esClient.esql.query);

    const output = await validateLoggingQueriesHandler({
      esClient,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      ceiling: 0.0001, // stricter than default
      logger,
    });

    expect(output.results[0].status).toBe('over_capture');
    expect(output.results[0].pass).toBe(false);
  });

  it('treats a zero repo total as a zero hit ratio (no divide-by-zero)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isTotalQuery(req.query)) {
        return { columns: TOTAL_COLUMNS, values: [[0]] };
      }
      if (isStatsQuery(req.query)) {
        return { columns: STATS_COLUMNS, values: [[0, 0]] };
      }
      return { columns: [], values: [] };
    }) as unknown as typeof esClient.esql.query);

    const output = await validateLoggingQueriesHandler({
      esClient,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    expect(output.repo_total_lines).toBe(0);
    expect(output.results[0].hit_ratio).toBe(0);
  });
});
