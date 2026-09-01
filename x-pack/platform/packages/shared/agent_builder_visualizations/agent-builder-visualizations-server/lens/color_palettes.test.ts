/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import {
  INVENTED_COLOR_BAN,
  LEGACY_PALETTE_BAN,
  getColorPalettesPromptContent,
  getSharedColorPalettesPromptContent,
} from './color_palettes';

describe('getColorPalettesPromptContent', () => {
  it.each(Object.values(SupportedChartType))(
    'includes the shared palette bans for %s',
    (chartType) => {
      const content = getColorPalettesPromptContent(chartType);
      expect(content).toContain(LEGACY_PALETTE_BAN);
      expect(content).toContain(INVENTED_COLOR_BAN);
    }
  );

  it('does not repeat the legacy palette ban on per-chart coloringRules', () => {
    for (const { prompt } of Object.values(chartTypeRegistry)) {
      expect(prompt.config?.coloringRules ?? []).not.toContain(LEGACY_PALETTE_BAN);
    }
  });

  it('omits shared bans when includeShared is false', () => {
    const content = getColorPalettesPromptContent(SupportedChartType.Metric, {
      includeShared: false,
    });
    expect(content).not.toContain(LEGACY_PALETTE_BAN);
    expect(content).toContain('METRIC COLORING RULES');
  });

  it('omits dynamic-step mechanics when includeShared is false', () => {
    const content = getColorPalettesPromptContent(SupportedChartType.Metric, {
      includeShared: false,
    });
    expect(content).not.toContain('DYNAMIC STEPS');
    expect(content).not.toContain('Available dynamic palettes');
    expect(content).toContain('METRIC COLORING RULES');
  });

  it('keeps per-chart step previews when includeShared is true', () => {
    const content = getColorPalettesPromptContent(SupportedChartType.Metric);
    expect(content).toContain('DYNAMIC STEPS');
    expect(content).toContain('exactly 3 steps');
    expect(content).toContain('a metric chart uses');
  });

  it('compiles shared bans once for the review section', () => {
    const content = getSharedColorPalettesPromptContent();
    expect(content).toContain(LEGACY_PALETTE_BAN);
    expect(content).toContain(INVENTED_COLOR_BAN);
    expect(content).toContain('DEFAULT POLICY');
  });

  it('compiles shared dynamic-step mechanics when includeMechanics is true', () => {
    const content = getSharedColorPalettesPromptContent({ includeMechanics: true });
    expect(content).toContain('DYNAMIC STEPS');
    expect(content).toContain('canonical 5-stop');
    expect(content).toMatch(/metric:\s*3/);
    expect(content).toMatch(/gauge:\s*4/);
    expect(content).not.toContain('a metric chart uses');
  });
});
