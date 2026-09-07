/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartStyleRulesPromptContent,
  getChartTypeConfigPromptContent,
  getChartTypeSelectionPromptContent,
} from './chart_type_guidance';
import { CHART_STYLE_RULES } from './chart_style_rules';
import { titleRulesPromptContent, numberFormatRulesPromptContent } from './config_rules';
import { getSharedColorPalettesPromptContent } from './color_palettes';
import { getLensPresentationEditGuidance } from './presentation';
import { createGenerateConfigPrompt } from './prompts';

const chartTypes = Object.values(SupportedChartType);

const getGenerationPrompt = (chartType: SupportedChartType): string =>
  JSON.stringify(
    createGenerateConfigPrompt({
      chartType,
      nlQuery: 'Create a chart',
      esqlQuery: 'ROW count=1',
      schema: {},
    })
  );

describe('chart type guidance', () => {
  it('describes every supported chart when selecting a visualization', () => {
    const selection = getChartTypeSelectionPromptContent();
    for (const chartType of chartTypes) {
      expect(selection).toContain(`- ${chartType}:`);
    }
  });

  describe('chart style rules', () => {
    const allRules = getChartStyleRulesPromptContent();
    const sharedBlocks = [
      titleRulesPromptContent,
      numberFormatRulesPromptContent,
      getSharedColorPalettesPromptContent(),
    ];

    it('compiles the shared blocks once and every chart-specific rule', () => {
      for (const block of sharedBlocks) {
        expect(allRules.split(block)).toHaveLength(2);
      }
      for (const [chartType, { rules }] of Object.entries(CHART_STYLE_RULES)) {
        expect(allRules).toContain(`### ${chartType}\n`);
        for (const rule of rules) {
          expect(allRules).toContain(`- ${rule}`);
        }
      }
    });

    it.each(chartTypes)('gives the %s generator exactly its own rules', (chartType) => {
      const ownRules = getChartStyleRulesPromptContent(chartType);
      for (const block of sharedBlocks) {
        expect(ownRules.split(block)).toHaveLength(2);
      }
      for (const [otherType, { rules }] of Object.entries(CHART_STYLE_RULES)) {
        const expectation = otherType === chartType ? expect(ownRules) : expect(ownRules).not;
        expectation.toContain(`### ${otherType}\n`);
        for (const rule of rules) {
          expectation.toContain(`- ${rule}`);
        }
      }
      expect(getGenerationPrompt(chartType)).toContain(JSON.stringify(ownRules).slice(1, -1));
    });

    it('keeps data-binding rules out of the shared rules', () => {
      expect(getChartTypeConfigPromptContent(SupportedChartType.XY)).toContain('x = category');
      expect(allRules).not.toContain('x = category');
    });

    it('keeps edit mechanics out of the shared rules and the generation prompt', () => {
      const editGuidance = getLensPresentationEditGuidance();
      expect(editGuidance).toContain('operation: "remove"');
      expect(allRules).not.toContain('operation: "remove"');
      for (const chartType of chartTypes) {
        expect(getGenerationPrompt(chartType)).not.toContain('operation: "remove"');
      }
    });
  });
});
