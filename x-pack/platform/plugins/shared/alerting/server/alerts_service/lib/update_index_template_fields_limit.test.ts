/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';
import { updateIndexTemplateFieldsLimit } from './update_index_template_fields_limit';

const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const createTemplate = (
  overrides: Partial<IndicesGetIndexTemplateIndexTemplateItem['index_template']> = {}
): IndicesGetIndexTemplateIndexTemplateItem => ({
  name: '.alerts-test.alerts-default-index-template',
  index_template: {
    index_patterns: ['.internal.alerts-test.alerts-default-*'],
    composed_of: ['mappings1', 'framework-mappings'],
    template: {
      settings: {
        'index.mapping.total_fields.limit': 2500,
        hidden: true,
      },
      mappings: {
        dynamic: false,
      },
    },
    priority: 7,
    _meta: { managed: true },
    ...overrides,
  },
});

describe('updateIndexTemplateFieldsLimit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls putIndexTemplate with the updated total_fields.limit', async () => {
    const template = createTemplate();

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '.alerts-test.alerts-default-index-template',
        template: expect.objectContaining({
          settings: expect.objectContaining({
            'index.mapping.total_fields.limit': 2600,
            'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
          }),
        }),
      })
    );
  });

  it('preserves existing template settings', async () => {
    const template = createTemplate({
      template: {
        settings: {
          hidden: true,
          'index.mapping.total_fields.limit': 2500,
          'index.mapping.ignore_malformed': true,
        },
        mappings: { dynamic: false },
      },
    });

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 3000 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.template?.settings).toEqual({
      hidden: true,
      'index.mapping.total_fields.limit': 3000,
      'index.mapping.ignore_malformed': true,
      'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
    });
  });

  it('preserves index_patterns, composed_of, priority, and _meta', async () => {
    const template = createTemplate();

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.index_patterns).toEqual(['.internal.alerts-test.alerts-default-*']);
    expect(call.composed_of).toEqual(['mappings1', 'framework-mappings']);
    expect(call.priority).toBe(7);
    expect(call._meta).toEqual({ managed: true });
  });

  it('strips system-managed created_date and modified_date from the PUT request', async () => {
    const template = createTemplate({
      created_date: '2026-04-01T00:00:00.000Z',
      created_date_millis: 1775145600000,
      modified_date: '2026-04-09T00:00:00.000Z',
      modified_date_millis: 1775836800000,
    } as IndicesGetIndexTemplateIndexTemplateItem['index_template']);

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call).not.toHaveProperty('created_date');
    expect(call).not.toHaveProperty('created_date_millis');
    expect(call).not.toHaveProperty('modified_date');
    expect(call).not.toHaveProperty('modified_date_millis');
  });

  it('normalizes ignore_missing_component_templates from string to string[]', async () => {
    const template = createTemplate({
      ignore_missing_component_templates: 'optional-component' as unknown as string[],
    });

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.ignore_missing_component_templates).toEqual(['optional-component']);
  });

  it('passes ignore_missing_component_templates as-is when already an array', async () => {
    const template = createTemplate({
      ignore_missing_component_templates: ['optional-1', 'optional-2'],
    });

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.ignore_missing_component_templates).toEqual(['optional-1', 'optional-2']);
  });

  it('omits ignore_missing_component_templates when not present', async () => {
    const template = createTemplate();

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 2600 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.ignore_missing_component_templates).toBeUndefined();
  });

  it('handles a template with no existing settings', async () => {
    const template = createTemplate({ template: { mappings: { dynamic: false } } });

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 3000 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.template?.settings).toEqual({
      'index.mapping.total_fields.limit': 3000,
      'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
    });
  });

  it('handles a template with no existing template block', async () => {
    const template = createTemplate({ template: undefined });

    await updateIndexTemplateFieldsLimit({ esClient, template, limit: 3000 });

    const call = esClient.indices.putIndexTemplate.mock.calls[0][0];
    expect(call.template).toEqual({
      settings: {
        'index.mapping.total_fields.limit': 3000,
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
      },
    });
  });
});
