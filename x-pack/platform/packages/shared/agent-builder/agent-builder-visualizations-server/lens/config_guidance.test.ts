/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getLensConfigGuidance } from './config_guidance';

const countOccurrences = (text: string, value: string): number => text.split(value).length - 1;

describe('getLensConfigGuidance', () => {
  it('includes each distinct chart type only once', () => {
    const guidance = getLensConfigGuidance([
      SupportedChartType.XY,
      SupportedChartType.Metric,
      SupportedChartType.XY,
      SupportedChartType.Metric,
    ]);

    expect(countOccurrences(guidance, 'CHART-SPECIFIC RULES FOR XY:')).toBe(1);
    expect(countOccurrences(guidance, '2) METRIC RULES')).toBe(1);
  });

  it('includes the shared title rules and relevant axis and color rules', () => {
    const guidance = getLensConfigGuidance([SupportedChartType.XY, SupportedChartType.Metric]);

    expect(guidance).toContain("Omit the 'title' field when the chart already displays");
    expect(guidance).toContain('Do NOT set axis titles');
    expect(guidance).toContain('Set axis title visibility to false');
    expect(guidance).toContain('do not color the background unless the user asks');
    expect(guidance).toContain('Do not color neutral data with no useful color meaning');
  });
});
