/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeSelectionPromptContent } from './lens/chart_type_guidance';

/**
 * Which engine renders a generated visualization. Lens is the default for
 * standard charts; Vega is the fallback for requests Lens cannot express.
 */
export type VisualizationRenderer = 'lens' | 'vega';

/**
 * The chosen rendering approach. When Lens is selected the best-fitting chart
 * type is carried so the Lens generator can skip a redundant chart-type guess;
 * Vega carries no chart type because it authors a free-form spec.
 */
export type VisualizationApproach =
  | { renderer: 'lens'; chartType: SupportedChartType; reasoning?: string }
  | { renderer: 'vega'; reasoning?: string };

const approachSchema = z
  .object({
    renderer: z
      .enum(['lens', 'vega'])
      .describe(
        'Pick "lens" whenever one of the available Lens chart types can express the request. Pick "vega" ONLY when none of them can or user explicitly asks for a Vega or Vega-Lite visualization.'
      ),
    chartType: z
      .nativeEnum(SupportedChartType)
      .optional()
      .describe('Required when renderer is "lens": the best-fitting Lens chart type.'),
    reasoning: z.string().optional().describe('Brief explanation for the decision.'),
  })
  .describe('Decision on how to render a data visualization.');

const buildSystemPrompt = (existingType?: string): string =>
  [
    'Decide how to render a request: a standard Lens chart or a custom Vega-Lite specification. Call the "decide_visualization_approach" tool; do not reply with plain text.',
    'Choose in order:',
    '1. If the user explicitly asks for a Vega or Vega-Lite visualization, choose "vega".',
    '2. Otherwise, if one of these Lens chart types fits, choose "lens" with the best-fitting one:',
    getChartTypeSelectionPromptContent(),
    '3. Otherwise choose "vega" (e.g. small multiples/faceting, layered/combination charts, scatter/bubble with an encoded size).',
    'Provide "chartType" only when you choose "lens".',
    existingType ? `The existing visualization uses: ${existingType}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Ask the model whether to render a request with Lens or Vega. Defaults to a
 * Lens metric if the model selects Lens without naming a chart type.
 */
export async function decideVisualizationApproach(
  modelProvider: ModelProvider,
  nlQuery: string,
  existingType?: string
): Promise<VisualizationApproach> {
  const model = await modelProvider.getDefaultModel();
  const structuredModel = model.chatModel.withStructuredOutput(approachSchema, {
    name: 'decide_visualization_approach',
  });

  const response = await structuredModel.invoke([
    { role: 'system', content: buildSystemPrompt(existingType) },
    { role: 'user', content: nlQuery },
  ]);

  if (response.renderer === 'vega') {
    return { renderer: 'vega', reasoning: response.reasoning };
  }

  return {
    renderer: 'lens',
    chartType: response.chartType ?? SupportedChartType.Metric,
    reasoning: response.reasoning,
  };
}
