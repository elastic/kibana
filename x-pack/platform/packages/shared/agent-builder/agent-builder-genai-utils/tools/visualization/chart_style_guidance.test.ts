/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartStyleGuidance } from './chart_style_guidance';

describe('getChartStyleGuidance', () => {
  it('returns xy chart title and axis guidance', () => {
    const guidance = getChartStyleGuidance(SupportedChartType.XY);

    expect(guidance).toContain('TITLE BEST PRACTICES:');
    expect(guidance).toContain('XY CHART STYLE RULES:');
  });

  it('returns metric chart title guidance', () => {
    const guidance = getChartStyleGuidance(SupportedChartType.Metric);

    expect(guidance).toContain('TITLE BEST PRACTICES:');
    expect(guidance).toContain('METRIC CHART STYLE RULES:');
  });

  it('returns empty guidance for unrelated chart types', () => {
    const guidance = getChartStyleGuidance(SupportedChartType.Gauge);

    expect(guidance).toBe('');
  });
});
