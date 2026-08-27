/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  getLatestVersion,
  imageAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { isDashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../../common';
import {
  getDashboardReviewPayloadSizes,
  inspectDashboardImage as defaultInspectDashboardImage,
} from './inspect_dashboard_image';
import type { InspectDashboardImage } from './types';

const MISSING_PRETTIFY_EVIDENCE =
  'Dashboard Review requires a dashboard attachment and an image of the painted dashboard. Without the image this is a normal dashboard edit, not Prettify.';

const reviewDashboardSchema = z.object({});

export type GetImageBytes = (fileId: string) => Promise<Buffer>;

export const reviewDashboardTool = ({
  getImageBytes,
  inspectDashboardImage = defaultInspectDashboardImage,
}: {
  getImageBytes: GetImageBytes;
  inspectDashboardImage?: InspectDashboardImage;
}): BuiltinSkillBoundedTool<typeof reviewDashboardSchema> => ({
  id: dashboardTools.reviewDashboard,
  type: ToolType.builtin,
  description: `Inspect a painted dashboard screenshot for visual findings using the same design practices as generate_dashboard (chart types, composition, grid, controls).

Requires a dashboard attachment and an image in the conversation. Returns structured findings (pack_layout, weak_sections, monotone_chart_types, wrong_chart_type, one_category_chart, weak_controls, duplicate_inner_title, metric_fill, thin_metric). Does not mutate the dashboard.

Reports dashboard-level packing, section grouping on a flat canvas, chart-type invert, limited chart-type variety, one-category charts, missing filters from catalog ES|QL, stacked chrome/inner titles, invented metric backgrounds, and sparse KPI trendlines. Does not report title phrasing or Kibana chrome.

Call this when the user asked to prettify a dashboard and an image is attached. Do not call it on a dashboard without an image.`,
  schema: reviewDashboardSchema,
  handler: async (_args, { attachments, modelProvider, logger }) => {
    const active = attachments.getActive();
    const dashboardAttachment = [...active].reverse().find(isDashboardAttachment);
    const imageAttachment = [...active]
      .reverse()
      .find((attachment) => attachment.type === AttachmentType.image);

    const dashboardVersion = dashboardAttachment
      ? getLatestVersion(dashboardAttachment)
      : undefined;
    const imageVersion = imageAttachment ? getLatestVersion(imageAttachment) : undefined;
    const imageData = imageVersion
      ? imageAttachmentDataSchema.safeParse(imageVersion.data)
      : undefined;

    if (!dashboardVersion || !imageData?.success) {
      return {
        results: [createErrorResult(MISSING_PRETTIFY_EVIDENCE)],
      };
    }

    try {
      const bytes = await getImageBytes(imageData.data.file_id);
      const dashboardData = dashboardVersion.data;
      const sizes = getDashboardReviewPayloadSizes(dashboardData);
      const ratio = (sizes.attachmentBytes / Math.max(sizes.catalogBytes, 1)).toFixed(1);
      logger.debug(
        `Dashboard Review payload: catalog ${sizes.catalogBytes}B, attachment ${sizes.attachmentBytes}B (${ratio}x)`
      );
      const findings = await inspectDashboardImage({
        dashboard: dashboardData,
        image: { bytes, mimeType: imageData.data.mime_type },
        modelProvider,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { findings },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Dashboard Review failed: ${message}`);
      return {
        results: [
          createErrorResult({
            message: `Dashboard Review failed: ${message}`,
          }),
        ],
      };
    }
  },
});
