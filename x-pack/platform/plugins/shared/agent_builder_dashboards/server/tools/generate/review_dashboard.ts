/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeReviewPromptContent } from '@kbn/agent-builder-visualizations-server';
import {
  dashboardRuleTopics,
  getDashboardReviewPromptContent,
  type DashboardRuleTopic,
} from '../../skills/generation_guidance';

const dashboardRuleTopicValues = [
  dashboardRuleTopics.composition,
  dashboardRuleTopics.grid,
  dashboardRuleTopics.controls,
  dashboardRuleTopics.sections,
] as const;

const chartTypeTopicValues = Object.values(SupportedChartType);

export type DashboardReviewTopic = DashboardRuleTopic | SupportedChartType;

const isReviewTopic = (value: string): value is DashboardReviewTopic =>
  (dashboardRuleTopicValues as readonly string[]).includes(value) ||
  (chartTypeTopicValues as readonly string[]).includes(value);

const isReviewSeverity = (value: string): value is 'miss' | 'consideration' =>
  value === 'miss' || value === 'consideration';

/**
 * Permissive judge schema: models often send `panel_id: null` or a topic that
 * is not one of the four dashboard rule topics. Rejecting those fails the
 * whole structured-output tool call.
 */
export const dashboardReviewLlmSchema = z.object({
  problems: z
    .array(
      z.object({
        topic: z
          .string()
          .max(64)
          .describe(
            'composition, grid, controls, sections, or a chart type (metric, xy, pie, …)'
          ),
        severity: z.string().max(32).describe('miss or consideration'),
        detail: z.string().max(2000),
        panel_id: z.string().max(256).nullish(),
      })
    )
    .max(50),
});

export type DashboardReview = {
  problems: Array<{
    topic: DashboardReviewTopic;
    severity: 'miss' | 'consideration';
    detail: string;
    panel_id?: string;
  }>;
};

const emptyReview: DashboardReview = { problems: [] };

export const normalizeDashboardReview = (
  raw: z.infer<typeof dashboardReviewLlmSchema>
): DashboardReview => ({
  problems: raw.problems.flatMap((problem) => {
    if (!isReviewTopic(problem.topic) || !isReviewSeverity(problem.severity)) {
      return [];
    }

    return [
      {
        topic: problem.topic,
        severity: problem.severity,
        detail: problem.detail,
        ...(problem.panel_id ? { panel_id: problem.panel_id } : {}),
      },
    ];
  }),
});

/**
 * Experimental judge: list layout/composition/control and chart-internal
 * problems on a generated dashboard. Reads the full attachment so panel
 * configs (breakdowns, fills, titles) are visible. Does not propose
 * operations or regenerate panels.
 */
export const reviewDashboard = async ({
  dashboard,
  modelProvider,
  logger,
}: {
  dashboard: DashboardAttachmentData;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<DashboardReview> => {
  try {
    const scopedModel = (await modelProvider.hasFastModel())
      ? await modelProvider.selectModel({ effortLevel: 'low' })
      : await modelProvider.getDefaultModel();

    const judge = scopedModel.chatModel.withStructuredOutput(dashboardReviewLlmSchema, {
      name: 'review_dashboard',
    });

    const result = await judge.invoke([
      [
        'system',
        `You judge a generated Kibana dashboard against the review rules.

List only problems that match those rules. Do not propose operations, do not regenerate the dashboard, and do not invent panels that are not in the attachment.
Do not validate field names, ES|QL, index mappings, ECS naming, or whether a field exists. You have no schema.
Use severity "miss" for required painted/layout violations and "consideration" for weaker "when it makes sense" items.
topic must be composition, grid, controls, sections, or the panel chart type (metric, xy, pie, …). Omit panel_id when the problem is not about a single panel.
If nothing is wrong, return an empty problems array.`,
      ],
      [
        'human',
        `${getDashboardReviewPromptContent()}

${getChartTypeReviewPromptContent()}

Judge only the listed misses and considerations, including chart-internal painted issues. Field names and index schema are out of scope.

DASHBOARD ATTACHMENT:
${JSON.stringify(dashboard, undefined, 2)}`,
      ],
    ]);

    return normalizeDashboardReview(dashboardReviewLlmSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Dashboard review failed; returning no problems: ${message}`);
    return emptyReview;
  }
};
