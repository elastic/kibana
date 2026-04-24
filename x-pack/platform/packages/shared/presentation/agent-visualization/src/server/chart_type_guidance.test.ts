/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeSelectionPromptContent } from './chart_type_guidance';

describe('getChartTypeSelectionPromptContent', () => {
  it('includes supported chart types and guidance text', () => {
    const content = getChartTypeSelectionPromptContent();

    expect(content).toContain(SupportedChartType.Metric);
    expect(content).toContain(SupportedChartType.XY);
    expect(content).toContain('Available chart types:');
    expect(content).toContain('Guidelines:');
  });
});
