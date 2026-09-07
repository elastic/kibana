/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { CHART_STYLE_RULES } from './chart_style_rules';
import {
  INVENTED_COLOR_BAN,
  LEGACY_PALETTE_BAN,
  getColorPalettesPromptContent,
  getSharedColorPalettesPromptContent,
} from './color_palettes';

describe('getColorPalettesPromptContent', () => {
  it('keeps shared policy out of chart-specific rules and palette examples', () => {
    for (const chartType of Object.values(SupportedChartType)) {
      expect(CHART_STYLE_RULES[chartType]?.rules ?? []).not.toContain(LEGACY_PALETTE_BAN);
      expect(getColorPalettesPromptContent(chartType)).not.toContain(LEGACY_PALETTE_BAN);
    }
  });

  it('keeps exact per-chart step previews', () => {
    const content = getColorPalettesPromptContent(SupportedChartType.Metric);
    expect(content).toContain('DYNAMIC STEPS');
    expect(content).toContain('exactly 3 steps');
    expect(content).toContain('a metric chart uses');
  });

  it('compiles color policy shared by generation and Prettify', () => {
    const content = getSharedColorPalettesPromptContent();
    expect(content).toContain(LEGACY_PALETTE_BAN);
    expect(content).toContain(INVENTED_COLOR_BAN);
    expect(content).toContain('DEFAULT POLICY');
    expect(content).toContain('Drop invented static hex colors, per-value `color_code` mappings');
    expect(content).toContain('unless the user asked for those colors');
  });

  it.each([
    [SupportedChartType.Metric, 3],
    [SupportedChartType.Gauge, 4],
    [SupportedChartType.Heatmap, 5],
  ] as const)('samples the full Status palette at the correct count for %s', (chartType, count) => {
    const line = getColorPalettesPromptContent(chartType)
      .split('\n')
      .find((entry) => entry.startsWith('- Status:'));
    const colors = line?.slice('- Status: '.length).split(', ');
    expect(colors).toHaveLength(count);
    expect(colors?.[0]).toBe('#24c292');
    expect(colors?.[count - 1]).toBe('#f6726a');
    expect(getColorPalettesPromptContent(chartType)).not.toContain('first N');
  });
});
