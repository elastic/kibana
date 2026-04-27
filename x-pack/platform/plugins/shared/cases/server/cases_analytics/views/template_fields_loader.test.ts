/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { loadTemplateFieldsUnion } from './template_fields_loader';

const makeArgs = () => ({
  savedObjectsClient: savedObjectsClientMock.create(),
  logger: loggingSystemMock.createLogger(),
});

const buildSo = (id: string, definition: string, deletedAt: string | null = null) => ({
  id,
  type: 'cases-templates',
  references: [],
  score: 1,
  attributes: { definition, deletedAt, isLatest: true } as never,
});

describe('loadTemplateFieldsUnion', () => {
  it('reads all latest, non-deleted templates for the requested owner across all spaces and returns the union of (name, type) pairs', async () => {
    const { savedObjectsClient, logger } = makeArgs();
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      page: 1,
      per_page: 200,
      saved_objects: [
        buildSo(
          't1',
          `name: tmpl-1
fields:
  - name: riskScore
    type: long
    control: INPUT_NUMBER
  - name: summary
    type: keyword
    control: INPUT_TEXT`
        ),
        buildSo(
          't2',
          `name: tmpl-2
fields:
  - name: riskScore
    type: long
    control: INPUT_NUMBER
  - name: incidentDate
    type: date
    control: DATE_PICKER`
        ),
      ],
    });

    const out = await loadTemplateFieldsUnion('securitySolution', savedObjectsClient, logger);

    // Two templates declare riskScore_as_long — deduplicated. summary and
    // incidentDate appear once each. Order follows insertion (t1 fields,
    // then t2 fields excluding the dupe).
    expect(out).toEqual([
      { name: 'riskScore', type: 'long' },
      { name: 'summary', type: 'keyword' },
      { name: 'incidentDate', type: 'date' },
    ]);

    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases-templates',
        namespaces: ['*'],
        filter:
          'cases-templates.attributes.isLatest: true AND cases-templates.attributes.owner: "securitySolution"',
        perPage: 200,
      })
    );
  });

  it('skips soft-deleted templates without contributing their fields', async () => {
    /*
     * FAILURE SCENARIO: a template is soft-deleted (deletedAt set). Its
     * extended fields should not appear in the view, otherwise the view
     * keeps a stale cast for a field no template recognizes.
     */
    const { savedObjectsClient, logger } = makeArgs();
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      page: 1,
      per_page: 200,
      saved_objects: [
        buildSo(
          'live',
          `name: live
fields:
  - name: alpha
    type: keyword
    control: INPUT_TEXT`
        ),
        buildSo(
          'tombstone',
          `name: tombstone
fields:
  - name: ghost
    type: long
    control: INPUT_NUMBER`,
          '2026-01-01T00:00:00.000Z'
        ),
      ],
    });

    expect(await loadTemplateFieldsUnion('securitySolution', savedObjectsClient, logger)).toEqual([
      { name: 'alpha', type: 'keyword' },
    ]);
  });

  it('skips templates with malformed YAML and warns, rather than failing the whole load', async () => {
    /*
     * FAILURE SCENARIO: an operator hand-edits a template SO with broken
     * YAML. We should not abort the regeneration of the views — the
     * other templates contribute as usual, and the broken one is logged.
     */
    const { savedObjectsClient, logger } = makeArgs();
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      page: 1,
      per_page: 200,
      saved_objects: [
        buildSo(
          'broken',
          // unclosed flow mapping — js-yaml throws YAMLException on this
          `name: broken
fields: { foo: bar`
        ),
        buildSo(
          'good',
          `name: good
fields:
  - name: alpha
    type: keyword
    control: INPUT_TEXT`
        ),
      ],
    });

    expect(await loadTemplateFieldsUnion('securitySolution', savedObjectsClient, logger)).toEqual([
      { name: 'alpha', type: 'keyword' },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipping cases-templates broken')
    );
  });

  it('paginates until every template has been read', async () => {
    const { savedObjectsClient, logger } = makeArgs();
    // First page: 200 (full), with total=201 — implies a second page exists.
    const page1Sos = Array.from({ length: 200 }, (_, i) =>
      buildSo(
        `t${i}`,
        `name: t${i}
fields:
  - name: f${i}
    type: keyword
    control: INPUT_TEXT`
      )
    );
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 201,
      page: 1,
      per_page: 200,
      saved_objects: page1Sos,
    });
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 201,
      page: 2,
      per_page: 200,
      saved_objects: [
        buildSo(
          'last',
          `name: last
fields:
  - name: lastField
    type: long
    control: INPUT_NUMBER`
        ),
      ],
    });

    const out = await loadTemplateFieldsUnion('securitySolution', savedObjectsClient, logger);
    expect(out).toHaveLength(201);
    expect(out[200]).toEqual({ name: 'lastField', type: 'long' });
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array when there are no templates at all', async () => {
    const { savedObjectsClient, logger } = makeArgs();
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 0,
      page: 1,
      per_page: 200,
      saved_objects: [],
    });
    expect(await loadTemplateFieldsUnion('securitySolution', savedObjectsClient, logger)).toEqual([]);
  });
});
