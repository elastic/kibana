/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { CHART_STYLE_RULES } from './chart_style_rules';
import { titleRulesPromptContent, numberFormatRulesPromptContent } from './config_rules';
import { getSharedColorPalettesPromptContent } from './color_palettes';
import { chartTypeRegistry } from './chart_type_registry';

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

/** Generation-only data-binding rules for one chart type. */
export const getChartTypeConfigPromptContent = (chartType: SupportedChartType) => {
  const rules = chartTypeRegistry[chartType].prompt.config?.rules;

  if (!rules?.length) {
    return '';
  }

  return [
    `CHART-SPECIFIC RULES FOR ${chartType.toUpperCase()}:`,
    ...rules.map((rule) => `- ${rule}`),
  ].join('\n');
};

/**
 * Style rules shared by chart generation (one chart type) and dashboard Prettify (all
 * chart types): titles, number formats, color policy, and per-chart-type rules.
 */
export const getChartStyleRulesPromptContent = (chartType?: SupportedChartType): string => {
  const entries = chartType
    ? [[chartType, CHART_STYLE_RULES[chartType]] as const]
    : Object.entries(CHART_STYLE_RULES);
  return [
    'CHART STYLE RULES:',
    'Apply these rules when creating or restyling charts. Judge conditional rules from the data and the user request; when an existing setting conflicts with a rule, follow the rule.',
    titleRulesPromptContent,
    numberFormatRulesPromptContent,
    getSharedColorPalettesPromptContent(),
    ...entries.flatMap(([type, styleRules]) =>
      styleRules ? [`### ${type}`, ...styleRules.rules.map((rule) => `- ${rule}`)] : []
    ),
  ].join('\n');
};
