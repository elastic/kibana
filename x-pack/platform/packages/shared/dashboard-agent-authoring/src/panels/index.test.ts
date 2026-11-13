/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import type { PanelResolutionRequest } from './registry';
import {
  buildConfigPanelContent,
  createPanelContentResolver,
  getConfigPanelReferences,
  getPanelTypeSelection,
  planPanelContent,
  upsertPanelContentSchema,
} from '.';

describe('upsert panel content schema', () => {
  it('keeps applyChartRules on Lens content', () => {
    const result = upsertPanelContentSchema.safeParse({
      type: 'vis',
      query: 'show total requests',
      applyChartRules: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('applyChartRules', true);
  });

  it('rejects content without a type', () => {
    expect(upsertPanelContentSchema.safeParse({ query: 'show total requests' }).success).toBe(
      false
    );
  });

  it('rejects the former request shape, which names its kind as renderer', () => {
    expect(
      upsertPanelContentSchema.safeParse({
        source: 'request',
        renderer: 'vega',
        query: 'show total requests',
      }).success
    ).toBe(false);
  });

  it('drops a by-value config from vis content, which is generated from its query', () => {
    const result = upsertPanelContentSchema.safeParse({
      type: 'vis',
      query: 'show total requests',
      config: { type: 'metric' },
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('config');
  });

  it('rejects vis content without a query', () => {
    expect(
      upsertPanelContentSchema.safeParse({ type: 'vis', config: { type: 'metric' } }).success
    ).toBe(false);
  });

  it('drops a config from custom_content content, which is generated from its query', () => {
    const result = upsertPanelContentSchema.safeParse({
      type: 'custom_content',
      config: { prompt: 'Show a KPI card' },
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('config');
  });

  it('keeps esql, hasData, regenerateESQL and index and drops Lens-only fields on custom_content', () => {
    const result = upsertPanelContentSchema.safeParse({
      type: 'custom_content',
      query: 'Show a KPI card for total errors',
      esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
      hasData: true,
      regenerateESQL: true,
      chartType: 'metric',
      index: 'logs-*',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
      hasData: true,
      regenerateESQL: true,
      index: 'logs-*',
    });
    expect(result.data).not.toHaveProperty('chartType');
  });

  it.each([
    ['a query-only', { query: 'Updated KPI' }],
    ['an esql-only', { esql: 'FROM logs-* | STATS count = COUNT(*)' }],
    ['a query-removing', { esql: null }],
    ['a static-making', { hasData: false }],
    ['a data-adding', { query: 'Add the error count', hasData: true, index: 'logs-*' }],
    ['a regenerating', { query: 'Show errors by host', regenerateESQL: true }],
  ])('accepts %s custom_content content', (_, fields) => {
    expect(
      upsertPanelContentSchema.safeParse({
        type: 'custom_content',
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
    expect(upsertPanelContentSchema.safeParse({ type, config }).success).toBe(true);
  });
});

describe('by-value panel type registry', () => {
  it('builds panel content for the registered embeddable type', () => {
    expect(buildConfigPanelContent('markdown', { content: 'hello' })).toEqual({
      type: MARKDOWN_EMBEDDABLE_TYPE,
      config: { content: 'hello' },
    });
  });

  it('edits only panels of the same kind', () => {
    expect(
      planPanelContent({
        id: 'panel-1',
        content: {
          type: 'markdown',
          config: { content: 'new', settings: { open_links_in_new_tab: true } },
        },
        existingPanel: {
          id: 'panel-1',
          type: 'vega',
          config: {
            spec: JSON.stringify({ data: { url: { '%type%': 'esql', query: 'FROM logs' } } }),
          },
          grid: { x: 0, y: 0, w: 24, h: 15 },
        },
      })
    ).toEqual({
      error: expect.stringMatching(
        /^Panel "panel-1" is a Vega panel\. Edit it with type: "vega"\./
      ),
    });
  });
});

describe('referenced config panel kinds', () => {
  it('returns a fix-it error naming the reference for an invalid config', () => {
    expect(
      buildConfigPanelContent('ml_anomaly_swimlane', { job_ids: 'job-1', swimlane_type: 'overall' })
    ).toEqual({
      error: expect.stringMatching(
        /^Invalid anomaly swim lane config\. Read the "ml_anomaly_swimlane" config reference and fix:\n.*job_ids/s
      ),
    });
  });

  it('publishes one reference per kind with its guidance, usage and config JSON Schema', () => {
    const references = getConfigPanelReferences();

    expect(references.map(({ type }) => type)).toEqual([
      'ml_anomaly_charts',
      'ml_anomaly_swimlane',
      'ml_single_metric_viewer',
    ]);
    references.forEach(({ type, label, content }) => {
      expect(content.startsWith(`# ${label} panel config\n\n`)).toBe(true);
      expect(content).toContain(`content: { type: "${type}", config }`);
      const [, json] = content.match(/\`\`\`json\n(.+)\n\`\`\`/s) ?? [];
      const jsonSchema = JSON.parse(json);
      expect(jsonSchema).not.toHaveProperty('$schema');
      expect(json).toContain('"job_ids"');
    });
  });
});

describe('createPanelContentResolver', () => {
  const success = (embeddableType: string) =>
    jest.fn().mockResolvedValue({
      type: 'success',
      panelContent: { type: embeddableType, config: {} },
    });

  const createExecutors = () => ({
    vis: success('lens'),
    vega: success('vega'),
    custom_content: success('custom_content'),
  });

  it('routes a Lens request to the Lens executor', async () => {
    const executors = createExecutors();
    const request: PanelResolutionRequest = { type: 'vis', nlQuery: 'total requests' };

    await createPanelContentResolver(executors)(request);

    expect(executors.vis).toHaveBeenCalledWith(request);
    expect(executors.vega).not.toHaveBeenCalled();
  });

  it('routes a request to the executor of its type', async () => {
    const executors = createExecutors();
    const request = {
      type: 'custom_content',
      nlQuery: 'status board',
      hasData: false,
    } as PanelResolutionRequest;

    await expect(createPanelContentResolver(executors)(request)).resolves.toEqual(
      expect.objectContaining({ type: 'success' })
    );
    expect(executors.custom_content).toHaveBeenCalledWith(request);
    expect(executors.vis).not.toHaveBeenCalled();
  });
});

describe('getPanelTypeSelection', () => {
  it('lists the panel kinds in priority order', () => {
    expect(getPanelTypeSelection()).toMatchInlineSnapshot(`
      "1. **Lens** (\`type: \\"vis\\"\`) — metrics, time series, bar, line, pie, area, and data tables.
      2. **Vega** (\`type: \\"vega\\"\`) — scatter/bubble plots, small multiples/faceting, layered or combination charts, custom encodings, or when the user asks for Vega.
      3. **Markdown** (\`type: \\"markdown\\"\`) — static text, links, or notes with no data.
      4. **Custom content** (\`type: \\"custom_content\\"\`) — a last resort for HTML/CSS layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or narrative text mixed with live data values, or when the user asks for a custom/HTML panel."
    `);
  });
});
