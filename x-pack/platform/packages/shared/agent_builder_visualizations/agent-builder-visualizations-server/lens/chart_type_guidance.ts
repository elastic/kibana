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
 * Compact review-side view of the registry: all chart-specific rules (config +
 * coloring) for the given chart types, without the palette previews used during
 * generation. Intended for judge/review prompts that evaluate authored charts
 * against the rules they were generated under.
 */
export const getChartTypeReviewPromptContent = (chartTypes: SupportedChartType[]): string =>
  chartTypes
    .map((chartType) => {
      const config = chartTypeRegistry[chartType].prompt.config;
      const rules = [...(config?.rules ?? []), ...(config?.coloringRules ?? [])];
      if (!rules.length) {
        return '';
      }
      return [
        `RULES FOR ${chartType.toUpperCase()} CHARTS:`,
        ...rules.map((rule) => `- ${rule}`),
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
