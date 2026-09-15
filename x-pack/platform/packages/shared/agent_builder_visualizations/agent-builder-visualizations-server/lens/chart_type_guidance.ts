/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ChartRule } from './chart_type_registry';
import { chartTypeRegistry } from './chart_type_registry';
import { colorDesignPromptContent } from './color_palettes';
import { generalChartRules } from './general_rules';

const toBullets = (rules: readonly string[]): string[] => rules.map((rule) => `- ${rule}`);

const designBullets = (rules: readonly ChartRule[]): string[] =>
  toBullets(rules.flatMap(({ design }) => (design ? [design] : [])));

const configBullets = (rules: readonly ChartRule[]): string[] =>
  toBullets(
    rules.flatMap(({ design, config }) => {
      const text = config ?? design;
      return text ? [text] : [];
    })
  );

export const getChartTypeSelectionPromptContent = () =>
  [
    "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:",
    ...Object.entries(chartTypeRegistry).map(
      ([chartType, { prompt }]) => `- ${chartType}: ${prompt.selection}`
    ),
  ].join('\n');

/**
 * Design guidance across all chart types for the visualization agent: the
 * `design` side of every rule plus the color design guidance. Contains no
 * Lens JSON.
 */
export const getChartDesignPromptContent = (): string =>
  [
    'CHART DESIGN GUIDANCE:',
    'The Lens config author follows the same guidance; state the design choices you want and it expresses them in the chart settings.',
    '',
    'General:',
    ...designBullets(generalChartRules),
    '',
    ...Object.entries(chartTypeRegistry).flatMap(([chartType, { prompt }]) => {
      const bullets = designBullets(prompt.rules ?? []);
      return bullets.length ? [`${chartType}:`, ...bullets, ''] : [];
    }),
    colorDesignPromptContent,
  ].join('\n');

/**
 * Rules for authoring one chart type's Lens config: the `config` side of every
 * general and chart-specific rule, falling back to `design` where a rule has
 * no Lens-specific wording. Color mechanics are compiled separately by
 * `getColorConfigPromptContent`.
 */
export const getChartTypeConfigPromptContent = (chartType: SupportedChartType): string =>
  [
    `CHART RULES FOR ${chartType.toUpperCase()}:`,
    ...configBullets(generalChartRules),
    ...configBullets(chartTypeRegistry[chartType].prompt.rules ?? []),
  ].join('\n');
