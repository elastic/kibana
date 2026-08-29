/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { ModelProvider } from '@kbn/agent-builder-server';
import {
  dashboardRuleTopics,
  getDashboardReviewPromptContent,
} from '../../skills/generation_guidance';
import type { DashboardSummary } from './summarize_dashboard';

const dashboardReviewSchema = z.object({
  problems: z.array(
    z.object({
      topic: z.enum([
        dashboardRuleTopics.composition,
        dashboardRuleTopics.grid,
        dashboardRuleTopics.controls,
        dashboardRuleTopics.sections,
      ]),
      severity: z.enum(['miss', 'consideration']),
      detail: z.string(),
      panel_id: z.string().optional(),
    })
  ),
});

export type DashboardReview = z.infer<typeof dashboardReviewSchema>;

const emptyReview: DashboardReview = { problems: [] };

/**
 * Controls keep `esql_query` on the agent-facing summary. The judge never sees
 * it — field paths are an authoring rule, not something review can verify.
 */
const toJudgeSummary = (summary: DashboardSummary): DashboardSummary => ({
  ...summary,
  controls: summary.controls.map(({ id, type, title }) => ({ id, type, title })),
});

/**
 * Experimental judge: list layout/composition/control problems on a generated
 * dashboard. Does not propose operations or regenerate panels.
 */
export const reviewDashboard = async ({
  summary,
  modelProvider,
  logger,
}: {
  summary: DashboardSummary;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<DashboardReview> => {
  try {
    const scopedModel = (await modelProvider.hasFastModel())
      ? await modelProvider.selectModel({ effortLevel: 'low' })
      : await modelProvider.getDefaultModel();

    const judge = scopedModel.chatModel.withStructuredOutput(dashboardReviewSchema, {
      name: 'review_dashboard',
    });

    const result = await judge.invoke([
      [
        'system',
        `You judge a generated Kibana dashboard against the review rules.

List only problems that match those rules. Do not propose operations, do not regenerate the dashboard, and do not invent panels that are not in the summary.
Do not validate field names, ES|QL, index mappings, ECS naming, or whether a field exists. You have no schema.
Use severity "miss" for required painted/layout violations and "consideration" for weaker "when it makes sense" items.
If nothing is wrong, return an empty problems array.`,
      ],
      [
        'human',
        `${getDashboardReviewPromptContent()}

Judge only the listed misses and considerations. Field names and index schema are out of scope.

DASHBOARD SUMMARY:
${JSON.stringify(toJudgeSummary(summary), undefined, 2)}`,
      ],
    ]);

    return dashboardReviewSchema.parse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Dashboard review failed; returning no problems: ${message}`);
    return emptyReview;
  }
};
