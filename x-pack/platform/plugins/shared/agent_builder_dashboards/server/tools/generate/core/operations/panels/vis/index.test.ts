/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { editPanelRequestInputSchema, panelRequestSchema } from '.';

const baseCreateRequest = {
  source: 'request' as const,
  type: 'vis' as const,
  query: 'show total requests',
  grid: { x: 0, y: 0, w: 12, h: 5 },
};

describe('visualization panel request schemas', () => {
  it('requires chartType when creating a Lens panel', () => {
    expect(
      panelRequestSchema.safeParse({
        ...baseCreateRequest,
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);

    expect(panelRequestSchema.safeParse(baseCreateRequest).success).toBe(false);
  });

  it('allows a Vega panel without a chartType hint', () => {
    expect(
      panelRequestSchema.safeParse({
        ...baseCreateRequest,
        renderer: 'vega',
      }).success
    ).toBe(true);
  });

  it('accepts optional key, title, intent, style fields, and omitted grid', () => {
    const parsed = panelRequestSchema.safeParse({
      source: 'request',
      type: 'vis',
      query: 'show total requests',
      chartType: SupportedChartType.Metric,
      key: 'requests',
      title: 'Total requests',
      intent: { sparkline: true },
      style_overrides: { legend: { position: 'right' } },
      style_request: 'make the legend smaller',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(
        expect.objectContaining({
          key: 'requests',
          title: 'Total requests',
          intent: { sparkline: true },
          style_overrides: { legend: { position: 'right' } },
          style_request: 'make the legend smaller',
        })
      );
      expect(parsed.data.grid).toBeUndefined();
    }
  });

  it('allows an edit without chartType because the existing panel provides context', () => {
    expect(
      editPanelRequestInputSchema.safeParse({
        source: 'request',
        type: 'vis',
        panelId: 'panel-1',
        query: 'use a clearer title',
      }).success
    ).toBe(true);
  });

  it('allows an edit without query and does not default regenerate_query', () => {
    const parsed = editPanelRequestInputSchema.safeParse({
      source: 'request',
      type: 'vis',
      panelId: 'panel-1',
      title: 'Renamed',
      hide_title: true,
      intent: { units: { latency: 'ms' } },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.query).toBeUndefined();
      expect(parsed.data.regenerate_query).toBeUndefined();
    }
  });

  it('accepts regenerate_query on an edit', () => {
    const parsed = editPanelRequestInputSchema.safeParse({
      source: 'request',
      type: 'vis',
      panelId: 'panel-1',
      query: 'use p95',
      regenerate_query: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.regenerate_query).toBe(true);
    }
  });
});
