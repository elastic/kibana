/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { dashboardTools } from '../../../common';
import { getErrorMessage } from '../generate/core';
import { retrieveLatestVersion } from '../generate/attachment_state';
import { reviewDashboard } from './core';

const reviewDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .describe('The id of the dashboard attachment to review, as returned by generate_dashboard.'),
  scope: z
    .enum(['recent_changes', 'full_audit'])
    .default('recent_changes')
    .describe(
      'Review scope. "recent_changes" (default): high-precision self-review of content you just generated — only clear, observable defects are reported. "full_audit": exhaustive audit of an existing dashboard that enforces the authoring guidelines fully — use when the user asks to review, improve, clean up, or prettify a dashboard they already have.'
    ),
  focus: z
    .string()
    .max(2048)
    .optional()
    .describe(
      '(optional) Free-text steer for the review. Use this to highlight recently changed panels or a specific concern, e.g. "I just edited the error rate and latency panels" or "check whether the legend placement works".'
    ),
});

/**
 * Dashboard review tool: re-executes every panel's ES|QL query and calls a
 * holistic LLM judge, returning structured findings the main agent can act on
 * via generate_dashboard. See the tool description for the usage contract.
 */
export const reviewDashboardTool = (): BuiltinSkillBoundedTool<typeof reviewDashboardSchema> => ({
  id: dashboardTools.reviewDashboard,
  type: ToolType.builtin,
  description: `Review an existing dashboard and return structured findings.

Re-executes every panel's ES|QL query using the dashboard's current time range, then judges the dashboard — data correctness (empty/all-zero results, broken queries), composition (ordering, redundancy, sections), consistency (units, formats, titles), readability (chart type fit, cardinality), controls, and metadata — against the authoring guidelines.

Two scopes: "recent_changes" (default) is a high-precision self-review of content you just generated; "full_audit" is an exhaustive audit of an existing dashboard that fully enforces the guidelines — use it when the user asks to review, improve, or prettify their dashboard.

Returns findings with severity (critical / warning / suggestion), affected panel_ids, and plain-prose suggestions. Use the findings to drive follow-up generate_dashboard calls. A full_audit result may include unreviewed_panel_ids — panels whose review failed and whose per-panel checks did not run.

**Call this tool in a separate turn from generate_dashboard.** The attachment it reads must already be persisted before this tool runs.`,
  schema: reviewDashboardSchema,
  handler: async (
    { dashboardAttachmentId, scope, focus },
    { logger, attachments, esClient, modelProvider, events }
  ) => {
    try {
      events.reportProgress('Re-executing panel queries and reviewing the dashboard');
      const latestVersion = retrieveLatestVersion(attachments, dashboardAttachmentId);
      if (!latestVersion) {
        return {
          results: [
            createErrorResult(
              `Dashboard attachment "${dashboardAttachmentId}" not found or has no versions.`
            ),
          ],
        };
      }

      const result = await reviewDashboard({
        dashboardData: latestVersion.data,
        version: latestVersion.version,
        focus,
        scope,
        esClient,
        modelProvider,
        logger,
      });

      return {
        results: [
          createOtherResult({
            dashboard_attachment_id: dashboardAttachmentId,
            ...result,
          }),
        ],
      };
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error(`Error in review_dashboard tool: ${message}`);
      return {
        results: [createErrorResult(`Failed to review dashboard: ${message}`)],
      };
    }
  },
});
