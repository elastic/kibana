/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { addPanelsItemSchema, addSectionPanelItemSchema } from '.';

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
