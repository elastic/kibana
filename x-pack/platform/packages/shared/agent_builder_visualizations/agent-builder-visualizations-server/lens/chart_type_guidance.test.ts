/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartDesignPromptContent,
  getChartTypeConfigPromptContent,
  getChartTypeSelectionPromptContent,
} from './chart_type_guidance';

describe('chart type guidance', () => {
  it('keeps Lens JSON out of the shared design guidance', () => {
    const design = getChartDesignPromptContent();

    expect(design).toContain('CHART DESIGN GUIDANCE');
    expect(design).toContain('COLOR GUIDANCE');
    expect(design).toContain('metric:');
    expect(design).not.toContain('apply_color_to');
    expect(design).not.toContain('styling.');
    expect(design).not.toContain('CHART RULES FOR');
  });

  it('gives the config author each rule once, in Lens terms where available', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('CHART RULES FOR METRIC');
    expect(metricConfig).toContain('Omit the top-level `title`');
    expect(metricConfig).not.toContain('No panel title');
    expect(metricConfig).toContain('styling.secondary.label.visible');
    expect(metricConfig).toContain('set `format` on the bound column');
    expect(metricConfig).not.toContain('show values in their natural unit');
    expect(metricConfig).not.toContain('bar_horizontal');
  });

  it('defaults metric panels to a trend background', () => {
    const design = getChartDesignPromptContent();
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(design).toContain('Default to a trend background');
    expect(design).not.toContain('A single number is fine');
    expect(metricConfig).toContain('Default to `background_chart: { type: "trend" }`');
    expect(metricConfig).toContain('including during enhancement');
    expect(metricConfig).not.toContain('A single number is fine');
  });

  it('warns both authors that percent formatting multiplies already-scaled columns', () => {
    const design = getChartDesignPromptContent();
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(design).toContain('Percent formatting multiplies by 100');
    expect(design).toContain('plain numbers with a "%" suffix');
    expect(metricConfig).toContain('`{ type: "percent" }` multiplies the value by 100');
    expect(metricConfig).toContain('{ type: "number", decimals: 1, suffix: "%" }');
    expect(metricConfig).not.toContain('Percent formatting multiplies by 100');
  });

  it('lists every chart type in the selection guidance', () => {
    const selection = getChartTypeSelectionPromptContent();

    for (const chartType of Object.values(SupportedChartType)) {
      expect(selection).toContain(`- ${chartType}: `);
    }
  });

  it.each(Object.values(SupportedChartType))('compiles a single rule list for %s', (chartType) => {
    const content = getChartTypeConfigPromptContent(chartType);

    expect(content).toMatch(new RegExp(`^CHART RULES FOR ${chartType.toUpperCase()}:\\n- `));
    expect(content).not.toContain('\n\n');
  });
});
