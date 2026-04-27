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

  const makeHit = (id: string, extended: Record<string, unknown>) =>
    ({
      _id: id,
      _source: { cases: { extended_fields: extended } },
    } as never);

  const mockSearch = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
    hits: ReturnType<typeof makeHit>[]
  ) => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: hits.length, relation: 'eq' }, max_score: 0, hits },
    } as never);
  };

  it('issues a per-owner search scoped to cases SOs that actually have extended_fields populated', async () => {
    const { esClient, logger } = setup();
    mockSearch(esClient, []);

    await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);

    expect(esClient.search).toHaveBeenCalledWith({
      index: '.kibana_alerting_cases',
      size: 200,
      _source: ['cases.extended_fields'],
      sort: [{ 'cases.updated_at': { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { 'cases.owner': 'securitySolution' } },
            { exists: { field: 'cases.extended_fields' } },
          ],
        },
      },
    });
  });

  it('returns the deduplicated (name, type) pairs unioned across the sampled cases', async () => {
    const { esClient, logger } = setup();
    mockSearch(esClient, [
      makeHit('case-1', { riskScore_as_long: 42, summary_as_keyword: 'hello' }),
      makeHit('case-2', { incidentDate_as_date: '2026-04-27', riskScore_as_long: 99 }),
      makeHit('case-3', { summary_as_keyword: 'again' }),
    ]);

    const out = await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);
    expect(out).toEqual([
      { name: 'riskScore', type: 'long' },
      { name: 'summary', type: 'keyword' },
      { name: 'incidentDate', type: 'date' },
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
    mockSearch(esClient, [
      makeHit('case-1', {
        riskScore_as_long: 42,
        legacy_no_suffix: 'value',
        foo_as_unknown_type: 'x',
      }),
    ]);

    expect(await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)).toEqual([
      { name: 'riskScore', type: 'long' },
    ]);
  });

  it('returns an empty array and logs a warning when search rejects, so plugin start is never aborted by a transient ES error', async () => {
    /*
     * FAILURE SCENARIO: ES returns 503, the cluster is initializing, or
     * the index has not been created yet on a fresh install. The view
     * sync runs at plugin start; we must degrade to "no extended fields
     * yet" rather than throwing and leaving the analytics surface broken.
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

  it('returns an empty array when there are no cases for the owner yet', async () => {
    const { esClient, logger } = setup();
    mockSearch(esClient, []);
    expect(
      await loadExtendedFieldsFromMapping('observability', esClient, logger)
    ).toEqual([]);
  });

  it('tolerates hits whose _source is missing or malformed without crashing', async () => {
    const { esClient, logger } = setup();
    mockSearch(esClient, [
      { _id: 'case-1' } as never, // no _source at all
      { _id: 'case-2', _source: {} } as never, // no cases.extended_fields
      { _id: 'case-3', _source: { cases: { extended_fields: null } } } as never,
      makeHit('case-4', { ok_as_keyword: 'value' }),
    ]);
    expect(await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)).toEqual([
      { name: 'ok', type: 'keyword' },
    ]);
  });
});
