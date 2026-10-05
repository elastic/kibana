/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  lensEditPanelRequestSchema,
  lensPanelRequestSchema,
  vegaEditPanelRequestSchema,
  vegaPanelRequestSchema,
} from '.';

const baseCreateRequest = {
  source: 'request' as const,
  query: 'show total requests',
  grid: { x: 0, y: 0, w: 12, h: 5 },
};

describe('visualization panel request schemas', () => {
  it('requires chartType when creating a Lens panel', () => {
    expect(
      lensPanelRequestSchema.safeParse({
        ...baseCreateRequest,
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);

    expect(lensPanelRequestSchema.safeParse(baseCreateRequest).success).toBe(false);
  });

  it('allows a Vega panel without a chartType hint', () => {
    expect(
      vegaPanelRequestSchema.safeParse({
        ...baseCreateRequest,
        renderer: 'vega',
      }).success
    ).toBe(true);
  });

  it('allows a Lens edit without chartType because the existing panel provides context', () => {
    expect(
      lensEditPanelRequestSchema.safeParse({
        source: 'request',
        panelId: 'panel-1',
        query: 'use a clearer title',
      }).success
    ).toBe(true);
  });

  it('does not accept applyChartRules on a Vega edit', () => {
    const result = vegaEditPanelRequestSchema.safeParse({
      source: 'request',
      renderer: 'vega',
      panelId: 'panel-1',
      query: 'use a clearer title',
      applyChartRules: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('applyChartRules');
  });
});
