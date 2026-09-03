/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { addPanelsItemSchema, editPanelItemSchema } from '.';

const lensRequest = {
  source: 'request' as const,
  type: 'vis' as const,
  query: 'show total requests',
  grid: { x: 0, y: 0, w: 12, h: 5 },
};

describe('panel item schemas', () => {
  it('routes a Lens request without renderer through the add_panels schema', () => {
    expect(
      addPanelsItemSchema.safeParse({
        ...lensRequest,
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);
  });

  it('allows add_panels request items to omit grid', () => {
    expect(
      addPanelsItemSchema.safeParse({
        source: 'request',
        type: 'vis',
        query: 'show total requests',
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);
  });

  it('allows config-source add_panels items to omit grid', () => {
    expect(
      addPanelsItemSchema.safeParse({
        source: 'config',
        type: 'markdown',
        key: 'intro',
        config: { content: '### Notes' },
      }).success
    ).toBe(true);
  });

  it('accepts a key on config-source add_panels items', () => {
    expect(
      addPanelsItemSchema.safeParse({
        source: 'config',
        type: 'markdown',
        key: 'intro',
        grid: { x: 0, y: 0, w: 48, h: 4 },
        config: { content: '### Notes' },
      }).success
    ).toBe(true);
  });

  it('requires chartType for a Lens request through the add_panels schema', () => {
    expect(addPanelsItemSchema.safeParse(lensRequest).success).toBe(false);
  });
});

const customContentBase = {
  source: 'config' as const,
  type: 'custom_content' as const,
  grid: { x: 0, y: 0, w: 6, h: 4 },
  config: { prompt: 'Show a KPI card for total errors' },
};

describe('custom_content panel schemas', () => {
  it('accepts a minimal custom_content panel (prompt only)', () => {
    expect(addPanelsItemSchema.safeParse(customContentBase).success).toBe(true);
  });

  it('accepts a custom_content panel with template and esqlQuery', () => {
    expect(
      addPanelsItemSchema.safeParse({
        ...customContentBase,
        config: {
          prompt: 'Error rate by service',
          template: '<div>{{ row["service.name"].value }}</div>',
          esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
        },
      }).success
    ).toBe(true);
  });

  it('rejects a custom_content panel missing prompt', () => {
    expect(
      addPanelsItemSchema.safeParse({
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
