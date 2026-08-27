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
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { isDashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { dashboardTools } from '../../../common';
import {
  createVisPanelResolver,
  executeDashboardOperations,
  getErrorMessage,
} from '../generate/core';
import { summarizeDashboard } from '../generate/summarize_dashboard';
import { applyDefaultDashboardTimeRange } from '../generate/time_range';
import { inspectDashboardImage as defaultInspectDashboardImage } from '../review_dashboard/inspect_dashboard_image';
import type { InspectDashboardImage } from '../review_dashboard/types';
import type { GetImageBytes } from '../review_dashboard';
import { findingsToPrettifyOperations } from './findings_to_prettify_operations';

const MISSING_PRETTIFY_EVIDENCE =
  'Prettify requires a dashboard attachment and an image of the painted dashboard. Without the image this is a normal dashboard edit.';

const prettifyDashboardSchema = z.object({});

const summarizeFindings = (findings: Array<{ rule: string; what: string }>) =>
  findings.map(({ rule, what }) => ({ rule, what }));

export const prettifyDashboardTool = ({
  getImageBytes,
  inspectDashboardImage = defaultInspectDashboardImage,
  customContentEnabled = true,
}: {
  getImageBytes: GetImageBytes;
  inspectDashboardImage?: InspectDashboardImage;
  customContentEnabled?: boolean;
}): BuiltinSkillBoundedTool<typeof prettifyDashboardSchema> => ({
  id: dashboardTools.prettifyDashboard,
  type: ToolType.builtin,
  description: `Prettify a painted Kibana dashboard: inspect the screenshot, then apply typed layout and chart-type fixes to the same dashboard attachment.

Requires a dashboard attachment and an image in the conversation. Inspects the image (Dashboard Review) and, when there are findings, mutates the dashboard in this same call. Does not add or remove visualization panels. Do not call generate_dashboard for a Prettify request. Do not read the image yourself.

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
      const operations = findingsToPrettifyOperations(findings);

      if (operations.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { findings: findingSummaries, applied: false },
            },
          ],
        };
      }

      const {
        dashboardData: nextDashboard,
        failures,
        panelAuthoringNotes,
      } = await executeDashboardOperations({
        dashboardData,
        operations,
        logger,
        resolvePanelContent: createVisPanelResolver({
          logger,
          modelProvider,
          events,
          esClient,
        }),
        resolveCustomContentTemplate: customContentEnabled
          ? createCustomContentTemplateResolver({ logger, modelProvider, esClient })
          : undefined,
      });

      const finalDashboardData = await applyDefaultDashboardTimeRange({
        dashboardData: nextDashboard,
        esClient,
        logger,
      });

      const attachment = await attachments.update(dashboardAttachment.id, {
        data: finalDashboardData,
        description: `Dashboard: ${finalDashboardData.title}`,
      });

      if (!attachment) {
        throw new Error(`Failed to persist dashboard attachment "${dashboardAttachment.id}".`);
      }

      logger.info('Prettify updated the dashboard attachment');

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { findings: findingSummaries, applied: true },
          },
          {
            type: ToolResultType.dashboard,
            tool_result_id: getToolResultId(),
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version ?? 1,
              dashboard: summarizeDashboard(
                finalDashboardData,
                new Map(
                  panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
                )
              ),
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
