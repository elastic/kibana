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
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isDashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../../common';
import { catalogDashboardPanels } from './catalog_dashboard_panels';
import { inspectDashboardImage as defaultInspectDashboardImage } from './inspect_dashboard_image';
import type { InspectDashboardImage } from './types';

const MISSING_PRETTIFY_EVIDENCE =
  'Panel Review requires a dashboard attachment and an image of the painted dashboard. Without the image this is a normal dashboard edit, not Prettify.';

const reviewPanelsSchema = z.object({});

export type GetImageBytes = (fileId: string) => Promise<Buffer>;

export const reviewPanelsTool = ({
  getImageBytes,
  inspectDashboardImage = defaultInspectDashboardImage,
}: {
  getImageBytes: GetImageBytes;
  inspectDashboardImage?: InspectDashboardImage;
}): BuiltinSkillBoundedTool<typeof reviewPanelsSchema> => ({
  id: dashboardTools.reviewPanels,
  type: ToolType.builtin,
  description: `Inspect a painted dashboard screenshot for panel-level visual findings.

Requires a dashboard attachment and an image in the conversation. Returns structured findings (panel id, rule, what is wrong). Does not mutate the dashboard.

Call this when the user asked to prettify a dashboard and an image is attached. Do not call it on a dashboard without an image.`,
  schema: reviewPanelsSchema,
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
      const findings = await inspectDashboardImage({
        panels: catalogDashboardPanels(dashboardVersion.data),
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
      logger.error(`Panel Review failed: ${message}`);
      return {
        results: [
          createErrorResult({
            message: `Panel Review failed: ${message}`,
          }),
        ],
      };
    }
  },
});
