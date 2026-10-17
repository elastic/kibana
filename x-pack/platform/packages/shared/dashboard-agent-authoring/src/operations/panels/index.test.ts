/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { CUSTOM_APP_EMBEDDABLE_TYPE, CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import {
  addPanelsItemSchema,
  addSectionPanelItemSchema,
  buildConfigPanelContent,
  editPanelItemSchema,
  getConfigPanelEditError,
} from '.';

const grid = { x: 0, y: 0, w: 12, h: 5 };

const lensRequest = {
  source: 'request' as const,
  query: 'show total requests',
  grid,
};

describe('panel item schemas', () => {
  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('routes a Lens request without renderer through the %s schema', (_, schema) => {
    expect(
      schema.safeParse({
        ...lensRequest,
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);
  });

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('requires chartType for a Lens request through the %s schema', (_, schema) => {
    expect(schema.safeParse(lensRequest).success).toBe(false);
  });

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('rejects a by-value visualization config through the %s schema', (_, schema) => {
    expect(
      schema.safeParse({
        source: 'config',
        type: 'vis',
        grid,
        config: { type: 'metric' },
      }).success
    ).toBe(false);
  });
});

describe('custom_content panel schemas', () => {
  const customContentRequest = {
    source: 'request' as const,
    renderer: 'custom_content' as const,
    grid,
    query: 'Show a KPI card for total errors',
  };

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('accepts a custom_content request with only a query through %s', (_, schema) => {
    expect(schema.safeParse(customContentRequest).success).toBe(true);
  });

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])(
    'keeps esql and drops Lens-only fields on a custom_content request through %s',
    (_, schema) => {
      const result = schema.safeParse({
        ...customContentRequest,
        esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
        chartType: SupportedChartType.Metric,
        index: 'logs-*',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        esql: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
      });
      expect(result.data).not.toHaveProperty('chartType');
      expect(result.data).not.toHaveProperty('index');
    }
  );

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('rejects a custom_content request without a query through %s', (_, schema) => {
    const { query, ...withoutQuery } = customContentRequest;

    expect(schema.safeParse(withoutQuery).success).toBe(false);
  });

  it('rejects the former config-source custom_content shape', () => {
    expect(
      addPanelsItemSchema.safeParse({
        source: 'config',
        type: 'custom_content',
        grid,
        config: { prompt: 'Show a KPI card' },
      }).success
    ).toBe(false);
  });
});

describe('edit_panels item schema', () => {
  const customContentEdit = {
    source: 'request' as const,
    renderer: 'custom_content' as const,
    panelId: 'cc-1',
  };

  it('accepts a Lens edit without renderer', () => {
    expect(
      editPanelItemSchema.safeParse({ source: 'request', panelId: 'panel-1', query: 'retitle' })
        .success
    ).toBe(true);
  });

  it.each([
    ['a query-only', { query: 'Updated KPI' }],
    ['an esql-only', { esql: 'FROM logs-* | STATS count = COUNT(*)' }],
    ['a query-removing', { esql: null }],
  ])('accepts %s custom_content edit', (_, fields) => {
    expect(editPanelItemSchema.safeParse({ ...customContentEdit, ...fields }).success).toBe(true);
  });

  it('rejects a custom_content edit with nothing to change', () => {
    expect(editPanelItemSchema.safeParse(customContentEdit).success).toBe(false);
  });

  it('accepts a markdown config edit', () => {
    expect(
      editPanelItemSchema.safeParse({
        source: 'config',
        type: 'markdown',
        panelId: 'md-1',
        config: { content: 'hello' },
      }).success
    ).toBe(true);
  });
});

describe('by-value panel type registry', () => {
  it('builds panel content for the registered embeddable type', () => {
    expect(buildConfigPanelContent('markdown', { content: 'hello' })).toEqual({
      type: MARKDOWN_EMBEDDABLE_TYPE,
      config: { content: 'hello' },
    });
  });

  it('allows editing a panel of the same embeddable type', () => {
    expect(
      getConfigPanelEditError('markdown', {
        id: 'md-1',
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: 'old' },
        grid,
      })
    ).toBeUndefined();
  });

  it('rejects editing a panel of a different embeddable type', () => {
    expect(
      getConfigPanelEditError('markdown', { id: 'panel-1', type: 'lens', config: {}, grid })
    ).toMatch(/Panel "panel-1" with type "lens" cannot be edited as markdown/);
  });
});

describe('custom app panels', () => {
  const document = {
    state: {},
    root: { type: 'heading', id: 'title', text: 'Hello' },
  };
  const add = {
    source: 'config' as const,
    type: 'custom_app' as const,
    grid,
    config: { document },
  };

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('accepts an app by value in %s', (_, schema) => {
    expect(schema.safeParse(add).success).toBe(true);
  });

  it('refuses an app that is not valid, such as one whose custom content has no template yet', () => {
    const unwritten = {
      state: {},
      root: { type: 'custom_content', id: 'board', prompt: 'A status board' },
    };

    expect(addPanelsItemSchema.safeParse({ ...add, config: { document: unwritten } }).success).toBe(
      false
    );
  });

  it('edits an app by panel id, replacing it', () => {
    expect(
      editPanelItemSchema.safeParse({
        source: 'config',
        type: 'custom_app',
        panelId: 'app-1',
        config: { document },
      }).success
    ).toBe(true);
  });

  it('is stored as a custom app panel, with the version of its state added', () => {
    expect(buildConfigPanelContent('custom_app', { document, title: 'Mine' })).toEqual({
      type: CUSTOM_APP_EMBEDDABLE_TYPE,
      config: { document, title: 'Mine', version: CUSTOM_APP_STATE_VERSION },
    });
  });

  it('refuses to edit a panel of another type as a custom app', () => {
    expect(
      getConfigPanelEditError('custom_app', { id: 'p', type: 'lens', config: {}, grid })
    ).toMatch(/Panel "p" with type "lens" cannot be edited as custom app/);
  });
});

describe('ML anomaly panel schemas', () => {
  const chartsBase = {
    source: 'config' as const,
    type: 'ml_anomaly_charts' as const,
    grid: { x: 0, y: 0, w: 24, h: 15 },
    config: { job_ids: ['job-1'], title: 'Anomaly charts of job-1' },
  };

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('accepts an anomaly charts panel with title through %s', (_, schema) => {
    expect(schema.safeParse(chartsBase).success).toBe(true);
  });

  it('accepts ML anomaly panel edit_panels items', () => {
    expect(
      editPanelItemSchema.safeParse({
        source: 'config' as const,
        type: 'ml_anomaly_charts' as const,
        panelId: 'charts-1',
        config: { job_ids: ['job-1'], severity_threshold: 50 },
      }).success
    ).toBe(true);
    expect(
      editPanelItemSchema.safeParse({
        source: 'config' as const,
        type: 'ml_anomaly_swimlane' as const,
        panelId: 'swim-1',
        config: {
          job_ids: ['job-1'],
          swimlane_type: 'overall',
          severity_threshold: 75,
        },
      }).success
    ).toBe(true);
    expect(
      editPanelItemSchema.safeParse({
        source: 'config' as const,
        type: 'ml_single_metric_viewer' as const,
        panelId: 'smv-1',
        config: { job_ids: ['job-1'], selected_entities: { 'host.name': 'web-01' } },
      }).success
    ).toBe(true);
  });
});
