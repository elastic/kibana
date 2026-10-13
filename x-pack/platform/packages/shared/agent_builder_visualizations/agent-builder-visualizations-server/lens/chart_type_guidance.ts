/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { generalChartRules } from './general_rules';

const toBullets = (rules: readonly string[]): string[] => rules.map((rule) => `- ${rule}`);

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

/**
 * Rules for authoring one chart type's Lens config: the general rules followed
 * by the chart-specific ones. `getColorConfigPromptContent` compiles the color
 * mechanics separately.
 */
export const getChartTypeConfigPromptContent = (chartType: SupportedChartType): string =>
  [
    `CHART RULES FOR ${chartType.toUpperCase()}:`,
    ...toBullets(generalChartRules),
    ...toBullets(chartTypeRegistry[chartType].prompt.rules ?? []),
  ].join('\n');
