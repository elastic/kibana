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

  it('issues a per-owner _field_caps call scoped to the cases.extended_fields parent', async () => {
    const { esClient, logger } = setup();
    esClient.fieldCaps.mockResolvedValueOnce({ indices: [], fields: {} } as never);

    await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: '.kibana_alerting_cases',
      fields: 'cases.extended_fields.*',
      include_unmapped: false,
      index_filter: {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { 'cases.owner': 'securitySolution' } },
          ],
        },
      },
    });
  });

  it('returns the deduplicated (name, type) pairs for every recognized subkey', async () => {
    const { esClient, logger } = setup();
    esClient.fieldCaps.mockResolvedValueOnce({
      indices: ['.kibana_alerting_cases-000001'],
      fields: {
        'cases.extended_fields.riskScore_as_long': {
          keyword: { type: 'keyword', searchable: true, aggregatable: true, metadata_field: false },
        },
        'cases.extended_fields.incidentDate_as_date': {
          keyword: { type: 'keyword', searchable: true, aggregatable: true, metadata_field: false },
        },
        'cases.extended_fields.summary_as_keyword': {
          keyword: { type: 'keyword', searchable: true, aggregatable: true, metadata_field: false },
        },
      },
    } as never);

    const out = await loadExtendedFieldsFromMapping('securitySolution', esClient, logger);
    expect(out).toEqual([
      { name: 'riskScore', type: 'long' },
      { name: 'incidentDate', type: 'date' },
      { name: 'summary', type: 'keyword' },
    ]);
  });

  it('skips subkeys with unknown types or missing suffixes rather than emitting a bad EVAL', async () => {
    const { esClient, logger } = setup();
    esClient.fieldCaps.mockResolvedValueOnce({
      indices: [],
      fields: {
        'cases.extended_fields.riskScore_as_long': {
          keyword: { type: 'keyword' } as never,
        },
        'cases.extended_fields.legacy_no_suffix': { keyword: { type: 'keyword' } as never },
        'cases.extended_fields.foo_as_unknown_type': { keyword: { type: 'keyword' } as never },
        // Sibling field that shouldn't be in the response, but we tolerate it
        'cases.title': { text: { type: 'text' } as never },
      },
    } as never);

    expect(await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)).toEqual([
      { name: 'riskScore', type: 'long' },
    ]);
  });

  it('returns an empty array and logs a warning when _field_caps rejects, so plugin start is never aborted by a transient ES error', async () => {
    /*
     * FAILURE SCENARIO: ES returns 503, the cluster is initializing, or
     * the index has not been created yet on a fresh install. The view
     * sync runs at plugin start; we must degrade to "no extended fields
     * yet" rather than throwing and leaving the analytics surface broken.
     */
    const { esClient, logger } = setup();
    esClient.fieldCaps.mockRejectedValueOnce(new Error('cluster_block'));

    expect(
      await loadExtendedFieldsFromMapping('securitySolution', esClient, logger)
    ).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load extended-field subkeys via _field_caps for owner=securitySolution')
    );
  });

  it('returns an empty array when there are no cases for the owner yet', async () => {
    const { esClient, logger } = setup();
    esClient.fieldCaps.mockResolvedValueOnce({ indices: [], fields: {} } as never);
    expect(
      await loadExtendedFieldsFromMapping('observability', esClient, logger)
    ).toEqual([]);
  });
});
