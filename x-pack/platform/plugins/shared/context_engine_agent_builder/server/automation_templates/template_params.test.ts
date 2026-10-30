/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAutomationTemplateCatalog,
  installAutomationTemplateRequestSchema,
  MAX_INDEX_METADATA_SOURCES,
  toInstallAutomationTemplateParams,
} from './template_params';

const parse = (body: Record<string, unknown>) => installAutomationTemplateRequestSchema.parse(body);
const issues = (body: Record<string, unknown>): string[] => {
  const result = installAutomationTemplateRequestSchema.safeParse(body);
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};

describe('installAutomationTemplateRequestSchema', () => {
  it('fills the document defaults and maps the request to install parameters', () => {
    const request = parse({
      template: 'document_orchestration',
      name: 'kb-docs',
      params: { sourceIndex: 'kb', titleField: 'title', bodyField: 'body' },
    });

    expect(toInstallAutomationTemplateParams(request)).toEqual({
      template: 'document_orchestration',
      name: 'kb-docs',
      sourceIndex: 'kb',
      titleField: 'title',
      bodyField: 'body',
      corpusFilter: '',
      maxDocuments: 50,
      bodyMaxChars: 12000,
    });
  });

  it('maps a unit profile source index onto the unit index the template reads', () => {
    const request = parse({
      template: 'unit_profile',
      name: 'products',
      params: {
        sourceIndex: 'orders',
        unitKey: 'product',
        activityField: 'order_date',
        breakdownField: 'category',
      },
    });

    expect(toInstallAutomationTemplateParams(request)).toEqual({
      template: 'unit_profile',
      name: 'products',
      unitIndex: 'orders',
      unitKey: 'product',
      activityField: 'order_date',
      breakdownField: 'category',
      metricFields: [],
      corpusFilter: '',
      maxUnits: 100,
    });
  });

  it('takes index metadata sources and a targeted writer kis block as they are', () => {
    const sources = [{ index: 'a', categoryField: 'tier' }];

    expect(
      toInstallAutomationTemplateParams(
        parse({ template: 'index_metadata', name: 'meta', params: { sources } })
      )
    ).toEqual({ template: 'index_metadata', name: 'meta', sources });
    expect(
      toInstallAutomationTemplateParams(
        parse({ template: 'targeted_ki_writer', name: 'kis', params: { kis: '- ki_id: a' } })
      )
    ).toEqual({ template: 'targeted_ki_writer', name: 'kis', kis: '- ki_id: a' });
  });

  it('rejects an unknown template', () => {
    expect(issues({ template: 'nope', name: 'x', params: {} })).not.toEqual([]);
  });

  it('rejects a parameter that belongs to another template, or none', () => {
    expect(
      issues({
        template: 'document_orchestration',
        name: 'kb-docs',
        params: { sourceIndex: 'kb', titleField: 't', bodyField: 'b', unitKey: 'x' },
      })
    ).not.toEqual([]);
  });

  it('rejects a missing required parameter', () => {
    expect(
      issues({ template: 'unit_profile', name: 'p', params: { sourceIndex: 'orders' } })
    ).not.toEqual([]);
  });

  it.each([
    ['blank', '   ', 'name must not be blank or whitespace-only'],
    ['with a slash', 'a/b', 'name must not contain a forward slash'],
  ])('rejects a name that is %s', (_label, name, message) => {
    expect(
      issues({ template: 'targeted_ki_writer', name, params: { kis: '- ki_id: a' } })
    ).toContain(message);
  });

  it('rejects the same index twice and the same metric twice', () => {
    expect(
      issues({
        template: 'index_metadata',
        name: 'meta',
        params: {
          sources: [
            { index: 'a', categoryField: 'x' },
            { index: 'a', categoryField: 'y' },
          ],
        },
      })
    ).toEqual(["sources lists 'a' twice; its two KIs would overwrite each other."]);
    expect(
      issues({
        template: 'unit_profile',
        name: 'p',
        params: {
          sourceIndex: 'o',
          unitKey: 'u',
          activityField: 'd',
          breakdownField: 'c',
          metricFields: ['price', 'price'],
        },
      })
    ).toEqual(["metricFields lists 'price' twice."]);
  });

  it('bounds the sources list', () => {
    const sources = Array.from({ length: MAX_INDEX_METADATA_SOURCES + 1 }, (_, i) => ({
      index: `idx-${i}`,
      categoryField: 'tier',
    }));

    expect(issues({ template: 'index_metadata', name: 'meta', params: { sources } })).not.toEqual(
      []
    );
  });
});

describe('getAutomationTemplateCatalog', () => {
  it('lists every template with a title, a description and its parameter schema', () => {
    const catalog = getAutomationTemplateCatalog();

    expect(catalog.map(({ id }) => id)).toEqual([
      'document_orchestration',
      'index_metadata',
      'unit_profile',
      'targeted_ki_writer',
    ]);
    for (const entry of catalog) {
      expect(entry.title).not.toBe('');
      expect(entry.description).not.toBe('');
      expect(entry.parameters).toEqual(expect.objectContaining({ type: 'object' }));
    }
  });

  it('marks only what an install must pass as required, defaults included', () => {
    const unitProfile = getAutomationTemplateCatalog().find(({ id }) => id === 'unit_profile');

    expect(unitProfile?.parameters).toEqual(
      expect.objectContaining({
        required: ['sourceIndex', 'unitKey', 'activityField', 'breakdownField'],
        properties: expect.objectContaining({
          maxUnits: expect.objectContaining({ default: 100, maximum: 10_000 }),
        }),
      })
    );
  });
});
