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
