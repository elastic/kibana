/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartTypeConfigPromptContent,
  getChartTypeSelectionPromptContent,
} from './chart_type_guidance';

describe('chart type guidance', () => {
  it('lists the general rules before the chart-specific ones', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('CHART RULES FOR METRIC');
    expect(metricConfig).toContain('Omit the top-level `title`');
    expect(metricConfig).toContain('styling.secondary.label.visible');
    expect(metricConfig).toContain('set `format` on the bound column');
    expect(metricConfig).not.toContain('bar_horizontal');
    expect(metricConfig.indexOf('set `format` on the bound column')).toBeLessThan(
      metricConfig.indexOf('Omit the top-level `title`')
    );
  });

  it('leaves metrics uncolored by default but colors bounded measures that read as good or bad', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('Omit `color` by default');
    expect(metricConfig).toContain('are the usual exception');
    expect(metricConfig).toContain('explicit 3-band `steps`');
    expect(metricConfig).toContain('Never set `apply_color_to` on its own');
    expect(metricConfig).toContain('in the same edit that sets the `color` config');
  });

  it('always sets XY legend visibility so breakdown legends are not hidden', () => {
    const xyConfig = getChartTypeConfigPromptContent(SupportedChartType.XY);

    expect(xyConfig).toContain('Always set `legend.visibility`');
    expect(xyConfig).toContain('an unset value hides the legend entirely');
    expect(xyConfig).toContain('Use `"auto"`');
    expect(xyConfig).toContain('`legend.layout: { type: "list" }` without legend statistics');
    expect(xyConfig).toContain('`legend.layout: { type: "grid" }` when statistics are set');
    expect(xyConfig).not.toContain('omit `legend.layout.type`');
    expect(xyConfig).not.toContain('Leave `legend.visibility` unset');
  });

  it('leaves pie legends to the Lens default', () => {
    const pieConfig = getChartTypeConfigPromptContent(SupportedChartType.Pie);
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(pieConfig).toContain('Omit `legend` entirely so Lens applies its defaults');
    expect(pieConfig).toContain('Drop any existing `legend` block');
    expect(metricConfig).not.toContain('Omit `legend` entirely');
  });

  it('warns that percent formatting multiplies already-scaled columns', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('`{ type: "percent" }` multiplies the value by 100');
    expect(metricConfig).toContain('{ type: "number", decimals: 1, suffix: "%" }');
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
