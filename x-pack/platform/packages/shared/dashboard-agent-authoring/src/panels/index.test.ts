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
  getEditableEmbeddableTypes,
  getInlinePanelKindGuidance,
  getPanelTypeSelection,
  upsertPanelContentSchema,
} from '.';

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

  it('keeps dataQueries and removeAllQueries on custom_content', () => {
    const result = upsertPanelContentSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      query: 'Show a KPI card for total errors',
      dataQueries: [{ description: 'total errors', index: 'logs-*' }],
      removeAllQueries: false,
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      dataQueries: [{ description: 'total errors', index: 'logs-*' }],
      removeAllQueries: false,
    });
  });

  it.each([
    ['a query-only', { query: 'Updated KPI' }],
    ['a data-query-only', { dataQueries: [{ esql: 'FROM logs-* | STATS count = COUNT(*)' }] }],
    ['a static-making', { removeAllQueries: true }],
    [
      'a data-adding',
      { query: 'Add the error count', dataQueries: [{}, { description: 'errors' }] },
    ],
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

  const configReferenceFields = {
    ml_anomaly_charts: ['max_series_to_plot'],
    ml_anomaly_swimlane: ['swimlane_type', 'per_page'],
    ml_single_metric_viewer: ['selected_detector_index'],
  };

  it('publishes one reference per kind with its guidance, usage and config JSON Schema', () => {
    const references = getConfigPanelReferences();

    expect(references.map(({ type }) => type)).toEqual([
      'ml_anomaly_charts',
      'ml_anomaly_swimlane',
      'ml_single_metric_viewer',
    ]);
    references.forEach(({ type, label, content }) => {
      expect(content.startsWith(`# ${label} panel config\n\n`)).toBe(true);
      expect(content).toContain(`content: { source: "config", type: "${type}", config }`);
      const [, json] = content.match(/\`\`\`json\n(.+)\n\`\`\`/s) ?? [];
      const jsonSchema = JSON.parse(json);
      expect(jsonSchema).not.toHaveProperty('$schema');
      expect(json).toContain('"job_ids"');
      Object.entries(configReferenceFields).forEach(([otherType, fields]) => {
        fields.forEach((field) => {
          if (otherType === type) {
            expect(json).toContain(`"${field}"`);
          } else {
            expect(json).not.toContain(`"${field}"`);
          }
        });
      });
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
    lens: success('lens'),
    vega: success('vega'),
    custom_content: success('custom_content'),
  });

  it('routes a request without renderer to the Lens executor', async () => {
    const executors = createExecutors();
    const request = { nlQuery: 'total requests' } as PanelResolutionRequest;

    await createPanelContentResolver(executors)(request);

    expect(executors.lens).toHaveBeenCalledWith(request);
    expect(executors.vega).not.toHaveBeenCalled();
  });

  it('routes a request to the executor of its renderer', async () => {
    const executors = createExecutors();
    const request = {
      renderer: 'custom_content',
      nlQuery: 'status board',
      hasData: false,
    } as PanelResolutionRequest;

    await expect(createPanelContentResolver(executors)(request)).resolves.toEqual(
      expect.objectContaining({ type: 'success' })
    );
    expect(executors.custom_content).toHaveBeenCalledWith(request);
    expect(executors.lens).not.toHaveBeenCalled();
  });
});

describe('getInlinePanelKindGuidance', () => {
  it('lists the guidance of every inline panel kind', () => {
    expect(getInlinePanelKindGuidance()).toMatchInlineSnapshot(`
      "## Custom Content Panels

      A custom content panel with live data does not need a query from you. When you create one, always say which kind it is, since there is no default: \`dataQueries\` for live data, or \`removeAllQueries: true\` for static content with no data. \`dataQueries\` lists the panel's queries by position, one entry per query, and the server generates each query from its \`description\` and samples its schema before generating the template. Set \`index\` on an entry when you know it. \`removeAllQueries: true\` makes a static panel — use that for banners, legends and notes, and never invent a query for them. Do not write a query yourself; give \`esql\` on an entry only when the user supplied one to use as it is. If the server cannot generate a query, the panel fails with an error naming the reason — fix the \`index\` or the description and retry rather than proceeding.

      To create one, set \`query\` to a concise description of what to display; the HTML template is generated server-side from it.

      To edit one, list its id in \`panels\` with \`source: \\"request\\"\`, \`renderer: \\"custom_content\\"\`. Set \`query\` to the requested change; layout, copy and style edits (colors, sizes, wording) keep the current queries, so send no \`dataQueries\`. An edit that needs different data, such as \\"also show the average bytes\\", a new grouping or filter, or another time window, also needs \`dataQueries\` with an entry at the position of the query to change: without it the stored query is kept and the new data can never appear. The server then regenerates that query from the \`description\`, keeping what the request does not change. \`removeAllQueries: true\` removes every query. The server refines the existing template.

      ### Panels with several queries

      When one panel needs data of more than one shape — headline numbers above a ranked list, say — send one \`dataQueries\` entry per query. The template reads the first as \`rows\` and the n-th as \`queries[n].rows\`. Each entry says what ONE query returns, not how it looks: \`{ description: \\"total requests and the number of 5xx errors, as one row\\", index: \\"logs-*\\" }\`, then \`{ description: \\"the five hosts with the most requests\\" }\`. \`query\` stays the layout and how each query is used. Keep a panel to a few queries (at most ten).

      To edit a panel that has several queries, send \`dataQueries\` only for the ones you change, in position order: an entry with \`description\` regenerates that query, \`esql\` replaces it, \`{}\` keeps it, and an entry past the current queries adds one. Queries you do not list are kept. They cannot be removed one at a time with this tool, and the panel's editor only lets the user remove the last query. To drop an earlier one, replace it with a different query (a new \`description\` or \`esql\`), or use \`removeAllQueries: true\` to remove them all. For a layout or style edit omit \`dataQueries\`: every query is kept."
    `);
  });
});

describe('getPanelTypeSelection', () => {
  it('lists the panel kinds in priority order', () => {
    expect(getPanelTypeSelection()).toMatchInlineSnapshot(`
      "1. **Lens** (\`renderer: \\"lens\\"\` or omitted) — metrics, time series, bar, line, pie, area, and data tables.
      2. **Vega** (\`renderer: \\"vega\\"\`) — scatter/bubble plots, small multiples/faceting, layered or combination charts, or when the user asks for Vega.
      3. **Markdown** (\`source: \\"config\\"\`, \`type: \\"markdown\\"\`) — static text, links, or notes with no data.
      4. **Custom content** (\`renderer: \\"custom_content\\"\`) — a last resort for HTML/CSS layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or narrative text mixed with live data values, or when the user asks for a custom/HTML panel."
    `);
  });
});
