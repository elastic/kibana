/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { applyHouseStyle } from './house_style';
import { isSupportedChartType, schemaForConfig } from './compile/chart_schemas';
import { stripPanelLevelKeys } from './panel_level';
import { convertCorpusPanels, dataIntent, loadLensCorpus } from './test_helpers/load_lens_corpus';

const panels = loadLensCorpus();
const builder = new LensConfigBuilder(undefined, true);

const describeIfCorpus = panels ? describe : describe.skip;

describeIfCorpus('applyHouseStyle corpus', () => {
  const converted = convertCorpusPanels(panels ?? []);

  it('loads converted panels', () => {
    expect(converted.length).toBeGreaterThan(0);
  });

  it('keeps converted configs schema-valid and conversion-safe', () => {
    let checked = 0;
    for (const panel of converted) {
      if (!isSupportedChartType(panel.config.type)) {
        continue;
      }
      const styled = applyHouseStyle(panel.config, {
        chartType: panel.config.type,
        mode: 'normalize',
        rules: 'defects',
        colors: 'keep',
      });
      const stripped = stripPanelLevelKeys(styled.config);
      const originalParsed = schemaForConfig(panel.config)?.safeParse(panel.config);
      if (!originalParsed?.success) {
        continue;
      }
      const parsed = schemaForConfig(stripped.config)?.safeParse(stripped.config);
      if (!parsed?.success) {
        throw new Error(
          `${panel.title} (${String(panel.config.type)}): ${parsed?.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')}`
        );
      }
      expect(() => builder.fromAPIFormat(stripped.config as LensApiConfig)).not.toThrow();
      expect(dataIntent(stripped.config)).toEqual(dataIntent(panel.config));
      const again = applyHouseStyle(
        { ...styled.config, ...styled.panelLevel },
        {
          chartType: panel.config.type,
          mode: 'normalize',
          rules: 'defects',
          colors: 'keep',
        }
      );
      expect(stripPanelLevelKeys(again.config).config).toEqual(stripped.config);
      expect(again.changes).toEqual([]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('does not record a change for background plus auto metric color', () => {
    const metrics = converted.filter((panel) => panel.config.type === 'metric');
    for (const panel of metrics) {
      const metricsField = panel.config.metrics;
      if (!Array.isArray(metricsField) || !metricsField[0] || typeof metricsField[0] !== 'object') {
        continue;
      }
      const primary = metricsField[0] as {
        color?: { type?: string };
        apply_color_to?: string;
      };
      if (primary.apply_color_to !== 'background' || primary.color?.type !== 'auto') {
        continue;
      }
      const styled = applyHouseStyle(panel.config, {
        chartType: SupportedChartType.Metric,
        mode: 'normalize',
        rules: 'defects',
        colors: 'keep',
      });
      expect(styled.changes.map((change) => change.id)).not.toContain('M2');
    }
  });
});
