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
    expect(design).not.toContain('CONFIGURATION RULES');
  });

  it('gives the config author the design plus the configuration rules for one chart', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('DESIGN GUIDANCE');
    expect(metricConfig).toContain('No panel title');
    expect(metricConfig).toContain('CONFIGURATION RULES FOR METRIC');
    expect(metricConfig).toContain('styling.secondary.label.visible');
    expect(metricConfig).not.toContain('bar_horizontal');
  });

  it('lists every chart type in the selection guidance', () => {
    const selection = getChartTypeSelectionPromptContent();

    for (const chartType of Object.values(SupportedChartType)) {
      expect(selection).toContain(`- ${chartType}: `);
    }
  });

  it.each(Object.values(SupportedChartType))(
    'compiles design and configuration sections for %s',
    (chartType) => {
      const content = getChartTypeConfigPromptContent(chartType);

      expect(content).toMatch(/^DESIGN GUIDANCE:\n- /);
      expect(content).toContain(`\n\nCONFIGURATION RULES FOR ${chartType.toUpperCase()}:\n- `);
    }
  );
});
