/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { lensPanelContentSchema, vegaPanelContentSchema } from '.';

const baseRequest = {
  source: 'request' as const,
  query: 'show total requests',
};

describe('visualization panel content schemas', () => {
  it.each([
    ['with', { chartType: SupportedChartType.Metric }],
    ['without', {}],
  ])('accepts Lens content %s chartType', (_, fields) => {
    expect(lensPanelContentSchema.safeParse({ ...baseRequest, ...fields }).success).toBe(true);
  });

  it('allows Vega content without a chartType hint', () => {
    expect(vegaPanelContentSchema.safeParse({ ...baseRequest, renderer: 'vega' }).success).toBe(
      true
    );
  });

  it('does not accept applyChartRules on Vega content', () => {
    const result = vegaPanelContentSchema.safeParse({
      ...baseRequest,
      renderer: 'vega',
      applyChartRules: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('applyChartRules');
  });
});
