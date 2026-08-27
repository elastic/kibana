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
import { applyDashboardOperations } from '../generate/apply_dashboard_operations';
import { getErrorMessage } from '../generate/core';
import { inspectDashboardImage as defaultInspectDashboardImage } from '../review_dashboard/inspect_dashboard_image';
import type { InspectDashboardImage } from '../review_dashboard/types';
import type { GetImageBytes } from '../review_dashboard';
import {
  planPrettifyOperations as defaultPlanPrettifyOperations,
  type PlanPrettifyOperations,
} from './plan_prettify_operations';

const MISSING_PRETTIFY_EVIDENCE =
  'Prettify requires a dashboard attachment and an image of the painted dashboard. Without the image this is a normal dashboard edit.';

const prettifyDashboardSchema = z.object({});

const summarizeFindings = (findings: Array<{ rule: string; what: string }>) =>
  findings.map(({ rule, what }) => ({ rule, what }));

export const prettifyDashboardTool = ({
  getImageBytes,
  inspectDashboardImage = defaultInspectDashboardImage,
  planPrettifyOperations = defaultPlanPrettifyOperations,
  customContentEnabled = true,
}: {
  getImageBytes: GetImageBytes;
  inspectDashboardImage?: InspectDashboardImage;
  planPrettifyOperations?: PlanPrettifyOperations;
  customContentEnabled?: boolean;
}): BuiltinSkillBoundedTool<typeof prettifyDashboardSchema> => ({
  id: dashboardTools.prettifyDashboard,
  type: ToolType.builtin,
  description: `Prettify a painted Kibana dashboard: inspect the screenshot, decide generate operations, and apply them to the same dashboard attachment.

Requires a dashboard attachment and an image in the conversation. Inspects the image (Dashboard Review), then an inner planner writes operations[] and this tool runs the same generate core. Does not add or remove visualization panels. Do not call generate_dashboard for a Prettify request. Do not read the image yourself.

Call this once when the user asked to prettify a dashboard and an image is attached.`,
  schema: prettifyDashboardSchema,
  handler: async (_args, { attachments, modelProvider, logger, events, esClient }) => {
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

    if (!dashboardAttachment || !dashboardVersion || !imageData?.success) {
      return {
        results: [createErrorResult(MISSING_PRETTIFY_EVIDENCE)],
      };
    }

    try {
      const bytes = await getImageBytes(imageData.data.file_id);
      const dashboardData = dashboardVersion.data;
      const findings = await inspectDashboardImage({
        dashboard: dashboardData,
        image: { bytes, mimeType: imageData.data.mime_type },
        modelProvider,
      });
      const findingSummaries = summarizeFindings(findings);

      if (findings.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                findings: findingSummaries,
                attachment_id: dashboardAttachment.id,
                version: dashboardAttachment.current_version ?? 1,
              },
            },
          ],
        };
      }

      const operations = await planPrettifyOperations({ findings, modelProvider });

      if (operations.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                findings: findingSummaries,
                attachment_id: dashboardAttachment.id,
                version: dashboardAttachment.current_version ?? 1,
              },
            },
          ],
        };
      }

      const { attachment, failures } = await applyDashboardOperations({
        attachments,
        dashboardAttachmentId: dashboardAttachment.id,
        existingDashboard: dashboardData,
        operations,
        createNew: false,
        logger,
        events,
        esClient,
        modelProvider,
        customContentEnabled,
      });

      logger.info('Prettify updated the dashboard attachment');

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              findings: findingSummaries,
              attachment_id: attachment.id,
              version: attachment.current_version ?? 1,
              failures: failures.length > 0 ? failures : undefined,
            },
          },
        ],
      };
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error(`Prettify failed: ${message}`);
      return {
        results: [
          createErrorResult({
            message: `Prettify failed: ${message}`,
          }),
        ],
      };
    }
  },
});
