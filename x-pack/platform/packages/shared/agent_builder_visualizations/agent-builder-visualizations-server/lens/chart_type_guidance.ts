/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { colorDesignPromptContent } from './color_palettes';
import { generalChartGuidance } from './general_rules';

const toBullets = (rules: readonly string[]): string[] => rules.map((rule) => `- ${rule}`);

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

/** Compiles Lens presentation guidance for the panel reviewer without configuration mechanics. */
export const getChartDesignPromptContent = (chartTypes: readonly string[]): string =>
  [
    'CHART DESIGN GUIDANCE:',
    'The Lens config author follows the same guidance; state the design choices you want and it expresses them in the chart settings.',
    '',
    'General:',
    ...toBullets(generalChartGuidance.design),
    '',
    ...Object.entries(chartTypeRegistry).flatMap(([chartType, { prompt }]) =>
      chartTypes.includes(chartType) && prompt.design?.length
        ? [`${chartType}:`, ...toBullets(prompt.design), '']
        : []
    ),
    colorDesignPromptContent,
  ].join('\n');

/**
 * Guidance for authoring one chart type's Lens config: the shared design
 * (general, chart-specific, and color) followed by the author-only
 * configuration rules that carry it out. Color configuration rules are
 * compiled separately by `getColorConfigPromptContent`.
 */
export const getChartTypeConfigPromptContent = (chartType: SupportedChartType): string => {
  const { design = [], config } = chartTypeRegistry[chartType].prompt;
  const rules = config?.rules ?? [];
  const upperChartType = chartType.toUpperCase();

  return [
    'DESIGN GUIDANCE:',
    ...toBullets(generalChartGuidance.design),
    ...toBullets(design),
    '',
    colorDesignPromptContent,
    '',
    `CONFIGURATION RULES FOR ${upperChartType}:`,
    ...toBullets(generalChartGuidance.config),
    ...toBullets(rules),
  ].join('\n');
};
