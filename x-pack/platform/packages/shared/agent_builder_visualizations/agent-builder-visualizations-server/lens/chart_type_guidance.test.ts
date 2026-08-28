/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';

describe('getChartTypeConfigPromptContent', () => {
  it('tells the metric author to hide titles on trend secondaries', () => {
    const prompt = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(prompt).toContain('CHART-SPECIFIC RULES FOR METRIC');
    expect(prompt).toContain('When a secondary metric is a trend');
    expect(prompt).toContain('styling.secondary.label.visible: false');
  });

  it('tells the metric author to omit the chart title and enrich a lone number', () => {
    const prompt = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(prompt).toContain('Do not set a chart title');
    expect(prompt).toContain('background_chart');
    expect(prompt).toContain('type: "trend"');
    expect(prompt).toContain('secondary metric with dynamic coloring');
  });

  it('tells the xy author to use gradient fills, list legends, and hide a one-series legend', () => {
    const prompt = getChartTypeConfigPromptContent(SupportedChartType.XY);

    expect(prompt).toContain('CHART-SPECIFIC RULES FOR XY');
    expect(prompt).toContain('styling.areas.fill: "gradient"');
    expect(prompt).toContain('legend.visibility: "hidden"');
    expect(prompt).toContain('layout: { type: "list" }');
    expect(prompt).toContain('legend.statistics');
    expect(prompt).toContain('axis title visibility to false');
  });
});
