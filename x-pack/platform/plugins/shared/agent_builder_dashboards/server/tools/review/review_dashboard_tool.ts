/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from '../attachment_state';
import { getErrorMessage } from '../generate/core';
import type { DashboardReviewResultData } from './review_result';
import { runDashboardReview } from './run_dashboard_review';
import { loadScreenshotAttachment, type GetFilesStart } from './screenshot';

const reviewDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .describe('Id of the dashboard attachment to review. The latest version is reviewed.'),
  userRequest: z
    .string()
    .max(4096)
    .describe(
      'The user\'s request in their own words, including any constraint they stated (e.g. "prettify this dashboard, keep the gauge bands").'
    ),
  screenshotAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) Id of an image attachment showing this exact dashboard version. Pass it only when the screenshot matches the current configuration; the initial Prettify screenshot no longer matches after the first edit.'
    ),
});

export interface ReviewDashboardToolDeps {
  getFilesStart: GetFilesStart;
}

/**
 * Read-only dashboard presentation review.
 *
 * Reads the latest version of a dashboard attachment, runs a fresh-context
 * model review against the shared composition, layout, chart design, and color
 * guidance, and returns findings with concrete corrections. It never writes to
 * attachments or queries indices; the main agent applies the corrections with
 * the generation tool.
 */
export const reviewDashboardTool = ({
  getFilesStart,
}: ReviewDashboardToolDeps): BuiltinSkillBoundedTool<typeof reviewDashboardSchema> => ({
  id: dashboardTools.reviewDashboard,
  type: ToolType.builtin,
  description: `Review the presentation of a dashboard attachment and get concrete corrections. Read-only.

Checks composition and section membership, panel sizing and packing, titles, number formats, colors and palettes, legends and axes, and other chart-specific defaults, while preserving explicit user choices and business thresholds. Returns the reviewed attachment id and version, dashboard-level findings with new sections and concrete grid changes, findings for the panels that need edits (panels without findings are listed as no_issues_panel_ids), panels that could not be assessed, and data questions to investigate separately. Apply the corrections with ${dashboardTools.generateDashboard}, then review the updated attachment again.`,
  schema: reviewDashboardSchema,
  handler: async (
    { dashboardAttachmentId, userRequest, screenshotAttachmentId },
    { attachments, modelProvider, logger }
  ) => {
    try {
      const latestVersion = retrieveLatestVersion(attachments, dashboardAttachmentId);
      if (!latestVersion) {
        return {
          results: [
            createErrorResult({
              message: `Dashboard attachment "${dashboardAttachmentId}" not found.`,
              metadata: { dashboardAttachmentId },
            }),
          ],
        };
      }

      const screenshotResult = screenshotAttachmentId
        ? await loadScreenshotAttachment({
            attachments,
            attachmentId: screenshotAttachmentId,
            getFilesStart,
          })
        : undefined;
      if (screenshotResult?.status === 'unavailable') {
        logger.warn(`Reviewing without screenshot: ${screenshotResult.reason}`);
      }
      const screenshot =
        screenshotResult?.status === 'loaded' ? screenshotResult.screenshot : undefined;

      const { review, unreviewedPanelIds } = await runDashboardReview({
        attachmentId: dashboardAttachmentId,
        version: latestVersion.version,
        dashboardData: latestVersion.data,
        context: { userRequest },
        screenshot,
        modelProvider,
        logger,
      });

      const data: DashboardReviewResultData = {
        attachment_id: dashboardAttachmentId,
        version: latestVersion.version,
        visual_assessment: screenshot ? 'screenshot' : 'configuration_only',
        ...(screenshotResult?.status === 'unavailable'
          ? { screenshot_note: screenshotResult.reason }
          : {}),
        review_complete: unreviewedPanelIds.length === 0,
        unreviewed_panel_ids: unreviewedPanelIds,
        ...review,
      };

      return { results: [createOtherResult(data)] };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error in review_dashboard tool: ${errorMessage}`);
      return {
        results: [
          createErrorResult({
            message: `Failed to review dashboard: ${errorMessage}`,
            metadata: { dashboardAttachmentId },
          }),
        ],
      };
    }
  },
});
