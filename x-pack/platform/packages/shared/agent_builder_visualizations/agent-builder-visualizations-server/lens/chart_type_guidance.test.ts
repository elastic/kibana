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
});
