/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';

describe('getChartTypeConfigPromptContent', () => {
  it('tells the xy author to use a gradient fill for area series', () => {
    const prompt = getChartTypeConfigPromptContent(SupportedChartType.XY);

    expect(prompt).toContain('CHART-SPECIFIC RULES FOR XY');
    expect(prompt).toContain('styling.areas.fill: "gradient"');
  });
});
