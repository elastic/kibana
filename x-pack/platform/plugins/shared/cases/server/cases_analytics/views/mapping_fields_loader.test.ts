/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  loadExtendedFieldsFromMapping,
  parseExtendedFieldSubkey,
} from './mapping_fields_loader';

describe('parseExtendedFieldSubkey', () => {
  it('parses paths under cases.extended_fields with a valid _as_<type> suffix', () => {
    expect(parseExtendedFieldSubkey('cases.extended_fields.riskScore_as_long')).toEqual({
      name: 'riskScore',
      type: 'long',
    });
    expect(parseExtendedFieldSubkey('cases.extended_fields.incidentDate_as_date')).toEqual({
      name: 'incidentDate',
      type: 'date',
    });
    expect(parseExtendedFieldSubkey('cases.extended_fields.summary_as_keyword')).toEqual({
      name: 'summary',
      type: 'keyword',
    });
  });

  it('returns null for paths outside the cases.extended_fields parent', () => {
    expect(parseExtendedFieldSubkey('cases.title')).toBeNull();
    expect(parseExtendedFieldSubkey('cases.extended_other.foo_as_long')).toBeNull();
    expect(parseExtendedFieldSubkey('extended_fields.foo_as_long')).toBeNull();
  });

  it('returns null when the suffix is missing or unrecognized', () => {
    /*
     * FAILURE SCENARIO: a manual SO write or a bug introduces a key
     * without the convention. We must not emit an EVAL with an unknown
     * cast — the view PUT would either fail or silently produce wrong
     * data. Skipping here is the safe degradation.
     */
    expect(parseExtendedFieldSubkey('cases.extended_fields.no_suffix')).toBeNull();
    expect(parseExtendedFieldSubkey('cases.extended_fields.foo_as_unknown')).toBeNull();
    expect(parseExtendedFieldSubkey('cases.extended_fields.foo_as_')).toBeNull();
    expect(parseExtendedFieldSubkey('cases.extended_fields._as_long')).toBeNull();
  });

  it('handles names that themselves contain `_as_` correctly (uses lastIndexOf)', () => {
    expect(parseExtendedFieldSubkey('cases.extended_fields.value_as_text_as_keyword')).toEqual({
      name: 'value_as_text',
      type: 'keyword',
    });
  });
});

describe('loadExtendedFieldsFromMapping', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    return { esClient, logger };
  };

  const mockAgg = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
    bucketKeys: string[]
  ) => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        keys: {
          buckets: bucketKeys.map((key) => ({ key, doc_count: 1 })),
        },
      },
    } as never);
  };

  it('issues a per-owner search with a runtime-field keyword aggregation, scoped to cases SOs that have extended_fields populated', async () => {
    const { esClient, logger } = setup();
    mockAgg(esClient, []);

    await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana_alerting_cases',
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { type: 'cases' } },
              { term: { 'cases.owner': 'securitySolution' } },
              { exists: { field: 'cases.extended_fields' } },
            ],
          },
        },
      })
    );
    const callArg = esClient.search.mock.calls[0][0] as {
      runtime_mappings?: Record<string, unknown>;
      aggregations?: Record<string, unknown>;
    };
    expect(callArg.runtime_mappings).toBeDefined();
    expect(callArg.aggregations).toEqual(
      expect.objectContaining({
        keys: { terms: expect.objectContaining({ size: 10_000 }) },
      })
    );
  });

  it('returns the deduplicated (name, type) pairs unioned across every key emitted by the agg', async () => {
    const { esClient, logger } = setup();
    mockAgg(esClient, [
      'riskScore_as_long',
      'incidentDate_as_date',
      'summary_as_keyword',
    ]);

    const out = await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);
    expect(out).toEqual([
      { name: 'riskScore', type: 'long' },
      { name: 'incidentDate', type: 'date' },
      { name: 'summary', type: 'keyword' },
    ]);
  });

  it('skips keys with unknown types or missing suffixes rather than emitting a bad EVAL', async () => {
    /*
     * FAILURE SCENARIO: an SO write set a key that doesn't follow the
     * `${name}_as_${type}` convention (manual edit, future schema drift).
     * Including it would either crash the view PUT or silently produce
     * a wrong cast. Skipping is the safe degradation.
     */
    const { esClient, logger } = setup();
    mockAgg(esClient, ['riskScore_as_long', 'legacy_no_suffix', 'foo_as_unknown_type']);

    expect(await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)).toEqual([
      { name: 'riskScore', type: 'long' },
    ]);
  });

  it('returns an empty array and logs a warning when the search rejects, so plugin start is never aborted by a transient ES error', async () => {
    /*
     * FAILURE SCENARIO: ES returns 503 / cluster initializing / inline
     * scripts disabled. The view sync runs at plugin start; we must
     * degrade to "no extended fields yet" rather than throwing.
     */
    const { esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('cluster_block'));

    expect(
      await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)
    ).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to discover extended-field subkeys for owner=securitySolution'
      )
    );
  });

  it('returns an empty array when there are no buckets (no cases for the owner have extended_fields populated yet)', async () => {
    const { esClient, logger } = setup();
    mockAgg(esClient, []);
    expect(
      await loadExtendedFieldsFromMapping('observability', esClient, logger)
    ).toEqual([]);
  });

  it('tolerates a missing aggregations key in the response', async () => {
    const { esClient, logger } = setup();
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as never);
    expect(
      await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)
    ).toEqual([]);
  });
});
