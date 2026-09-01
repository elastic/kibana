/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getColorPalettesPromptContent,
  getSharedColorPalettesPromptContent,
} from './color_palettes';
import { titleRulesPromptContent, numberFormatRulesPromptContent } from './config_rules';
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

/**
 * Compiles the full vis-author pack for review/prettify: title and number-format
 * rules, per-chart coloring, `config.rules`, and `review.critical` /
 * `review.suggestions`. The visualization author still sees only the
 * per-request slices ({@link getChartTypeConfigPromptContent},
 * {@link getColorPalettesPromptContent}).
 */
export const getChartTypeReviewPromptContent = (): string => {
  const sections = Object.entries(chartTypeRegistry).flatMap(([chartType, { prompt }]) => {
    const coloring = getColorPalettesPromptContent(chartType as SupportedChartType, {
      includeShared: false,
    });
    const configRules: string[] = prompt.config?.rules ?? [];
    const critical: string[] = prompt.review?.critical ?? [];
    const suggestions: string[] = prompt.review?.suggestions ?? [];

    if (!coloring && !configRules.length && !critical.length && !suggestions.length) {
      return [];
    }

    return [
      `### ${chartType}`,
      coloring,
      ...configRules.map((rule) => `- ${rule}`),
      ...(critical.length ? ['Critical:', ...critical.map((rule) => `- ${rule}`)] : []),
      ...(suggestions.length ? ['Suggestions:', ...suggestions.map((rule) => `- ${rule}`)] : []),
    ];
  });

  return [
    'CHART REVIEW RULES:',
    titleRulesPromptContent,
    numberFormatRulesPromptContent,
    '### shared',
    getSharedColorPalettesPromptContent({ includeMechanics: true }),
    ...sections,
  ].join('\n');
};
