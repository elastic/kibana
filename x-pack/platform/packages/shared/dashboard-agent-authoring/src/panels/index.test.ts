/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { buildConfigPanelContent, getEditableEmbeddableTypes, upsertPanelContentSchema } from '.';

describe('upsert panel content schema', () => {
  it('routes a request without renderer to Lens content', () => {
    const result = upsertPanelContentSchema.safeParse({
      source: 'request',
      query: 'show total requests',
      applyChartRules: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('applyChartRules', true);
  });

  it('rejects a by-value visualization config', () => {
    expect(
      upsertPanelContentSchema.safeParse({
        source: 'config',
        type: 'vis',
        config: { type: 'metric' },
      }).success
    ).toBe(false);
  });

  it('rejects the former config-source custom_content shape', () => {
    expect(
      upsertPanelContentSchema.safeParse({
        source: 'config',
        type: 'custom_content',
        config: { prompt: 'Show a KPI card' },
      }).success
    ).toBe(false);
  });

  it('keeps esql and drops Lens-only fields on custom_content', () => {
    const result = upsertPanelContentSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      query: 'Show a KPI card for total errors',
      esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
      chartType: 'metric',
      index: 'logs-*',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
    });
    expect(result.data).not.toHaveProperty('chartType');
    expect(result.data).not.toHaveProperty('index');
  });

  it.each([
    ['a query-only', { query: 'Updated KPI' }],
    ['an esql-only', { esql: 'FROM logs-* | STATS count = COUNT(*)' }],
    ['a query-removing', { esql: null }],
  ])('accepts %s custom_content content', (_, fields) => {
    expect(
      upsertPanelContentSchema.safeParse({
        source: 'request',
        renderer: 'custom_content',
        ...fields,
      }).success
    ).toBe(true);
  });

  it.each([
    ['markdown', { content: 'hello' }],
    ['ml_anomaly_charts', { job_ids: ['job-1'], title: 'Anomaly charts of job-1' }],
    ['ml_anomaly_swimlane', { job_ids: ['job-1'], swimlane_type: 'overall' }],
    ['ml_single_metric_viewer', { job_ids: ['job-1'] }],
  ])('accepts %s config content', (type, config) => {
    expect(upsertPanelContentSchema.safeParse({ source: 'config', type, config }).success).toBe(
      true
    );
  });
});

describe('by-value panel type registry', () => {
  it('builds panel content for the registered embeddable type', () => {
    expect(buildConfigPanelContent('markdown', { content: 'hello' })).toEqual({
      type: MARKDOWN_EMBEDDABLE_TYPE,
      config: { content: 'hello' },
    });
  });

  it('edits only panels of the same embeddable type', () => {
    expect(
      getEditableEmbeddableTypes({
        source: 'config',
        type: 'markdown',
        config: { content: 'new', settings: { open_links_in_new_tab: true } },
      })
    ).toEqual([MARKDOWN_EMBEDDABLE_TYPE]);
  });
});
