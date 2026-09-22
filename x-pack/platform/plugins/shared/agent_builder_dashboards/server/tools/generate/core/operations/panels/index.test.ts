/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { addPanelsItemSchema, addSectionPanelItemSchema, editPanelItemSchema } from '.';

const lensRequest = {
  source: 'request' as const,
  type: 'vis' as const,
  query: 'show total requests',
  grid: { x: 0, y: 0, w: 12, h: 5 },
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
});

const customContentBase = {
  source: 'config' as const,
  type: 'custom_content' as const,
  grid: { x: 0, y: 0, w: 6, h: 4 },
  config: { prompt: 'Show a KPI card for total errors' },
};

describe('custom_content panel schemas', () => {
  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('accepts a minimal custom_content panel (prompt only) through %s', (_, schema) => {
    expect(schema.safeParse(customContentBase).success).toBe(true);
  });

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('accepts a custom_content panel with template and esqlQuery through %s', (_, schema) => {
    expect(
      schema.safeParse({
        ...customContentBase,
        config: {
          prompt: 'Error rate by service',
          template: '<div>{{ row["service.name"].value }}</div>',
          esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
        },
      }).success
    ).toBe(true);
  });

  it.each([
    ['add_panels', addPanelsItemSchema],
    ['add_section', addSectionPanelItemSchema],
  ])('rejects a custom_content panel missing prompt through %s', (_, schema) => {
    expect(
      schema.safeParse({
        ...customContentBase,
        config: {},
      }).success
    ).toBe(false);
  });

  it('accepts a custom_content edit_panels item', () => {
    expect(
      editPanelItemSchema.safeParse({
        source: 'config' as const,
        type: 'custom_content' as const,
        panelId: 'panel-123',
        config: { prompt: 'Updated KPI', template: '<div>Updated</div>' },
      }).success
    ).toBe(true);
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
