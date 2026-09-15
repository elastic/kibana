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
  userPreferences: z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Only explicit user preferences that override chart defaults, e.g. "keep the existing colors". Omit for plain prettify requests. Do not include your analysis, edit plan, or a summary of the dashboard.'
    ),
  screenshotAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) Id of an image attachment showing this exact dashboard version. Pass it only when the screenshot matches the current configuration.'
    ),
});

interface ReviewDashboardToolDeps {
  getFilesStart: GetFilesStart;
}

/** Reviews panel presentation without modifying the dashboard or querying data. */
export const reviewDashboardTool = ({
  getFilesStart,
}: ReviewDashboardToolDeps): BuiltinSkillBoundedTool<typeof reviewDashboardSchema> => ({
  id: dashboardTools.reviewDashboard,
  type: ToolType.builtin,
  description: `Read-only check of the listed chart defaults, called once during Prettify: title and label visibility, number formatting, legends, axes, colors, and fills. Returns concise correction strings and panel coverage; apply corrections with ${dashboardTools.generateDashboard}. The main agent owns semantic correctness, dashboard metadata, chart selection, sections, sizing, and grid layout.`,
  schema: reviewDashboardSchema,
  handler: async (
    { dashboardAttachmentId, userPreferences, screenshotAttachmentId },
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

      const review = await runDashboardReview({
        dashboardData: latestVersion.data,
        userPreferences,
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
