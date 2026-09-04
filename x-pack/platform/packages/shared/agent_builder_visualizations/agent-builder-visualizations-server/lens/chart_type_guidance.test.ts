/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartTypeConfigPromptContent,
  getChartTypeReviewPromptContent,
  getChartTypeSelectionPromptContent,
  getChartDefaultsPromptContent,
} from './chart_type_guidance';
import { CHART_DEFAULTS } from './chart_defaults';
import { titleRulesPromptContent, numberFormatRulesPromptContent } from './config_rules';
import { getSharedColorPalettesPromptContent } from './color_palettes';
import { getLensPresentationEditGuidance } from './presentation';
import { createGenerateConfigPrompt } from './prompts';

describe('chart type guidance', () => {
  it('describes every supported chart when selecting a visualization', () => {
    for (const type of Object.values(SupportedChartType)) {
      expect(getChartTypeSelectionPromptContent()).toContain(`- ${type}:`);
    }
  });

  it('shares defaults without leaking generation-only instructions into review', () => {
    const review = getChartTypeReviewPromptContent();
    expect(review).toContain('CHART DEFAULTS');
    expect(review).toContain('axis.x.title.visible');
    expect(review).toContain('legend.visibility');
    expect(review).toContain('follow explicit requirements even when existing settings conflict');
    expect(review).not.toContain('exact phrase');
    expect(review).not.toContain('first N colors');
    expect(review).not.toContain('DYNAMIC STEPS');
    expect(review).not.toContain('config.defaults');
    expect(review).not.toContain('fills missing');
    expect(review).toContain('Unmentioned settings remain unchanged');
    expect(review).toContain('Never modify queries, data sources, filters, aggregations');
    expect(review).toContain('layers.0.y.0.format.type');
    expect(review).not.toContain('including number formats or custom color objects');
  });

  it.each(Object.values(SupportedChartType))(
    'shares the same visual rules with both agents for %s',
    (chartType) => {
      const defaults = getChartDefaultsPromptContent(chartType);
      const generation = createGenerateConfigPrompt({
        chartType,
        nlQuery: 'Create a chart',
        esqlQuery: 'ROW count=1',
        schema: {},
      });
      expect(JSON.stringify(generation)).toContain(JSON.stringify(defaults).slice(1, -1));
      for (const rule of CHART_DEFAULTS[chartType]?.rules ?? []) {
        expect(defaults).toContain(rule);
        expect(getChartTypeReviewPromptContent()).toContain(rule);
      }
      for (const shared of [
        titleRulesPromptContent,
        numberFormatRulesPromptContent,
        getSharedColorPalettesPromptContent(),
      ]) {
        expect(defaults).toContain(shared);
        expect(getChartTypeReviewPromptContent()).toContain(shared);
        expect(defaults.split(shared)).toHaveLength(2);
      }
      for (const other of Object.values(SupportedChartType).filter((type) => type !== chartType)) {
        expect(defaults).not.toContain(`### ${other}\n`);
      }
      expect(JSON.stringify(generation)).toContain(
        'the system does not apply those preferences for you'
      );
      expect(JSON.stringify(generation)).not.toContain('Omit defaults from generated JSON');
    }
  );

  it('keeps data-binding rules specific to generation', () => {
    expect(getChartTypeConfigPromptContent(SupportedChartType.XY)).toContain('x = category');
    expect(getChartTypeReviewPromptContent()).not.toContain('x = category');
  });

  it('uses only common preferences for charts without established type-specific rules', () => {
    const review = getChartTypeReviewPromptContent();
    for (const chartType of [
      SupportedChartType.Tagcloud,
      SupportedChartType.RegionMap,
      SupportedChartType.Treemap,
      SupportedChartType.Waffle,
      SupportedChartType.Mosaic,
    ]) {
      const defaults = getChartDefaultsPromptContent(chartType);
      expect(defaults).toContain(titleRulesPromptContent);
      expect(defaults).toContain(numberFormatRulesPromptContent);
      expect(defaults).toContain(getSharedColorPalettesPromptContent());
      expect(defaults).not.toContain('###');
      expect(review).not.toContain(`### ${chartType}`);
    }
    expect(getChartDefaultsPromptContent(SupportedChartType.Pie)).toContain(
      'Omit legend.visibility (or set "auto")'
    );
  });

  it('keeps edit mechanics out of shared preferences and generation', () => {
    const review = getChartTypeReviewPromptContent();
    const editGuidance = getLensPresentationEditGuidance();
    expect(review.split(editGuidance)).toHaveLength(2);
    for (const instruction of [
      'Unmentioned settings remain unchanged',
      'explicitly clear title or set hide_title: true',
      'remove incompatible legend.layout and legend.columns',
      'explicitly remove apply_color_to as well as color',
    ]) {
      expect(editGuidance).toContain(instruction);
      expect(getChartDefaultsPromptContent()).not.toContain(instruction);
      for (const chartType of Object.values(SupportedChartType)) {
        const generation = createGenerateConfigPrompt({
          chartType,
          nlQuery: 'Create a chart',
          esqlQuery: 'ROW count=1',
          schema: {},
        });
        expect(JSON.stringify(generation)).not.toContain(instruction);
      }
    }
  });

  it.each([
    {
      chartType: SupportedChartType.Metric,
      rules: ['Always omit panel titles on metric charts', 'The metric must be titleless'],
    },
    {
      chartType: SupportedChartType.XY,
      rules: [
        'Do NOT set axis titles',
        'axis.x.title.visible: false and axis.y.title.visible: false',
        'legend.placement: "outside" and legend.position: "bottom"',
        'Omit legend.layout.type',
        'Leave legend.visibility unset by default',
        'When legend statistics are set, use legend.visibility: "visible"',
        'For a one-series categorical chart without legend statistics, hide the legend',
        'Most time-series line charts should be gradient area',
        'Keep at most one line (the primary overview trend)',
        'Skip bars, categorical charts, and a lone line that is already the only time series',
      ],
    },
    {
      chartType: SupportedChartType.Gauge,
      rules: [
        "Always omit the optional 'min' and 'max' fields from the final configuration",
        'Do not infer, synthesize, or backfill gauge bounds',
        'Only include goal/target-related fields when the user explicitly asks',
        'range: "percentage" and exactly 4 bands: 0–25, 25–50, 50–75, 75–100',
        'keep those same percentage bands and only change the step colors',
        'Do not invent absolute gauge thresholds',
      ],
    },
    {
      chartType: SupportedChartType.Pie,
      rules: ['Omit legend.visibility (or set "auto")', 'Do not set "visible" or "hidden"'],
    },
  ])('preserves the original visual policy for $chartType', ({ chartType, rules }) => {
    const defaults = getChartDefaultsPromptContent(chartType);
    for (const rule of rules) {
      expect(defaults).toContain(rule);
      expect(getChartTypeReviewPromptContent()).toContain(rule);
    }
  });

  it('allows the specific restyles required by the shared rules while preserving data', () => {
    const review = getChartTypeReviewPromptContent();
    expect(review).toContain('layers.<index>.type to "area"');
    expect(review).toContain(
      'Line-to-area restyling must keep the layer data and bindings unchanged'
    );
    expect(review).toContain(
      'removing optional gauge metric.min, metric.max, and unrequested metric.goal'
    );
    expect(review).not.toContain('Never modify queries, data sources, filters, column bindings');
    expect(review).not.toContain('Preserve meaningful colors');
    expect(review).not.toContain('Retain an axis title');
    expect(review).not.toContain('Do not convert lines to areas');
    expect(review).not.toContain('Keep a title that adds context');
  });
});
