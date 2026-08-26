/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getColorPalettesPromptContent } from './color_palettes';

describe('getColorPalettesPromptContent', () => {
  it('tells the metric author not to keep invented static or background fills on edit', () => {
    const prompt = getColorPalettesPromptContent(SupportedChartType.Metric);

    expect(prompt).toContain('METRIC COLORING RULES');
    expect(prompt).toContain('do not preserve invented static colors or background fills');
    expect(prompt).toContain('apply_color_to: "background"');
  });
});
