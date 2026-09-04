/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
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
 * Compiles vis-author `config.rules` plus `review.critical` and
 * `review.suggestions` for every chart type that has any of them. Prettify
 * uses this so it can detect painted issues and describe the wanted edition;
 * the visualization author still sees only {@link getChartTypeConfigPromptContent}.
 */
export const getChartTypeReviewPromptContent = (): string => {
  const sections = Object.entries(chartTypeRegistry).flatMap(([chartType, { prompt }]) => {
    const configRules: string[] = prompt.config?.rules ?? [];
    const critical: string[] = prompt.review?.critical ?? [];
    const suggestions: string[] = prompt.review?.suggestions ?? [];

    if (!configRules.length && !critical.length && !suggestions.length) {
      return [];
    }

    return [
      `### ${chartType}`,
      ...configRules.map((rule) => `- ${rule}`),
      ...(critical.length ? ['Critical:', ...critical.map((rule) => `- ${rule}`)] : []),
      ...(suggestions.length ? ['Suggestions:', ...suggestions.map((rule) => `- ${rule}`)] : []),
    ];
  });

  if (!sections.length) {
    return '';
  }

  return ['CHART REVIEW RULES:', ...sections].join('\n');
};
