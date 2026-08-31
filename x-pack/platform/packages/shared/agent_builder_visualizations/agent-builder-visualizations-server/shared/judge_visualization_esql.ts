/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';

const visualizationEsqlJudgeSchema = z.object({
  keep: z
    .boolean()
    .describe(
      'True when the current query already answers the request and follows the visualization ES|QL guidance closely enough that it should not be rewritten.'
    ),
});

export interface JudgeVisualizationEsqlParams {
  query: string;
  nlQuery: string;
  instructions: string;
  modelProvider: ModelProvider;
  logger: Logger;
}

/**
 * Decide whether an existing visualization ES|QL query can be kept. Checks
 * request intent and the visualization ES|QL guidance only — it does not
 * invent a replacement query.
 */
export const judgeVisualizationEsql = async ({
  query,
  nlQuery,
  instructions,
  modelProvider,
  logger,
}: JudgeVisualizationEsqlParams): Promise<boolean> => {
  const scopedModel = (await modelProvider.hasFastModel())
    ? await modelProvider.selectModel({ effortLevel: 'low' })
    : await modelProvider.getDefaultModel();

  const judge = scopedModel.chatModel.withStructuredOutput(visualizationEsqlJudgeSchema, {
    name: 'judge_visualization_esql',
  });

  const result = await judge.invoke([
    [
      'system',
      `You judge whether an existing ES|QL query should be kept for a Kibana visualization.

Keep the query when it already answers the natural-language request and follows the visualization ES|QL guidance closely enough that rewriting it would not improve the chart.
Do not keep it when the request needs different data (filters, metrics, groupings, time behavior) or when the query violates that guidance in a way that should be rewritten (for example DATE_TRUNC, a hardcoded bucket interval, or a time series missing ?_tstart / ?_tend).
Do not write a new query. Only decide keep.`,
    ],
    [
      'human',
      `REQUEST:
${nlQuery}

CURRENT ES|QL:
${query}

VISUALIZATION ES|QL GUIDANCE:
${instructions}`,
    ],
  ]);

  const { keep } = visualizationEsqlJudgeSchema.parse(result);
  logger.debug(`Visualization ES|QL judge ${keep ? 'kept' : 'rejected'} the current query`);
  return keep;
};
