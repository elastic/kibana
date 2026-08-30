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

  it('tells the pie author to use the Lens default palette', () => {
    const prompt = getColorPalettesPromptContent(SupportedChartType.Pie);

    expect(prompt).toContain('PIE COLORING RULES');
    expect(prompt).toContain('Omit explicit `color`');
    expect(prompt).toContain('Lens default palette');
    expect(prompt).toContain('do not preserve invented');
  });

  it('tells the xy author not to keep invented custom series colors on edit', () => {
    const prompt = getColorPalettesPromptContent(SupportedChartType.XY);

    expect(prompt).toContain('XY COLORING RULES');
    expect(prompt).toContain('do not preserve invented');
    expect(prompt).not.toContain('preserve its existing explicit colors');
  });

  it('tells the datatable author not to keep invented custom cell colors on edit', () => {
    const prompt = getColorPalettesPromptContent(SupportedChartType.Datatable);

    expect(prompt).toContain('DATA_TABLE COLORING RULES');
    expect(prompt).toContain('do not preserve invented');
  });
});
