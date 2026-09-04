/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { CHART_DEFAULTS } from './chart_defaults';
import { titleRulesPromptContent, numberFormatRulesPromptContent } from './config_rules';
import { getSharedColorPalettesPromptContent } from './color_palettes';
import { getLensPresentationEditGuidance } from './presentation';
import { chartTypeRegistry } from './chart_type_registry';

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

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

/** Compiles the same visual preferences for the chart generator and dashboard agent. */
export const getChartDefaultsPromptContent = (chartType?: SupportedChartType): string => {
  const entries = chartType
    ? [[chartType, CHART_DEFAULTS[chartType]] as const]
    : Object.entries(CHART_DEFAULTS);
  return [
    'CHART DEFAULTS:',
    'Apply these chart rules when generating or improving charts. Use the data and user request to evaluate conditional rules; follow explicit requirements even when existing settings conflict with them.',
    titleRulesPromptContent,
    numberFormatRulesPromptContent,
    getSharedColorPalettesPromptContent(),
    ...entries.flatMap(([type, defaults]) =>
      defaults ? [`### ${type}`, ...defaults.rules.map((rule) => `- ${rule}`)] : []
    ),
  ].join('\n');
};

/** Shared chart guidance plus the explicit presentation-edit interface for Prettify. */
export const getChartTypeReviewPromptContent = (): string =>
  [getChartDefaultsPromptContent(), getLensPresentationEditGuidance()].join('\n');
