/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { getRemovedPanels, upsertMarkdownPanel, type VisualizationFailure } from './utils';
import type { VisualizationQueryInput } from './visualization_generation';

export const visualizationQueryInputSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z.string().optional().describe('(optional) Index, alias, or datastream to target.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('(optional) The type of chart to create.'),
  esql: z.string().optional().describe('(optional) An ES|QL query to use for the visualization.'),
}) satisfies z.ZodType<VisualizationQueryInput>;

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const upsertMarkdownOperationSchema = z.object({
  operation: z.literal('upsert_markdown'),
  markdownContent: z.string().describe('Markdown content for the dashboard summary panel.'),
});

export const addGeneratedPanelsOperationSchema = z.object({
  operation: z.literal('add_generated_panels'),
  items: z
    .array(visualizationQueryInputSchema)
    .min(1)
    .describe('Visualization generation requests to execute in order.'),
});

export const addPanelsFromAttachmentsOperationSchema = z.object({
  operation: z.literal('add_panels_from_attachments'),
  attachmentIds: z
    .array(z.string())
    .min(1)
    .describe('Attachment ids to resolve into dashboard panels.'),
});

export const removePanelsOperationSchema = z.object({
  operation: z.literal('remove_panels'),
  panelIds: z.array(z.string()).min(1).describe('Panel ids to remove from the dashboard.'),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  upsertMarkdownOperationSchema,
  addGeneratedPanelsOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  removePanelsOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  generatePanels: (
    items: VisualizationQueryInput[],
    onPanelCreated?: (panel: LensAttachmentPanel) => void
  ) => Promise<{ panels: LensAttachmentPanel[]; failures: VisualizationFailure[] }>;
  resolvePanelsFromAttachments: (
    attachmentIds: string[]
  ) => Promise<{ panels: AttachmentPanel[]; failures: VisualizationFailure[] }>;
  onPanelsAdded: (panels: AttachmentPanel[]) => void;
  onPanelsRemoved: (panels: AttachmentPanel[]) => void;
}

export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  generatePanels,
  resolvePanelsFromAttachments,
  onPanelsAdded,
  onPanelsRemoved,
}: ExecuteDashboardOperationsParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: VisualizationFailure[];
}> => {
  let nextDashboardData = structuredClone(dashboardData);
  const failures: VisualizationFailure[] = [];

  for (const operation of operations) {
    switch (operation.operation) {
      case 'set_metadata': {
        if (operation.title === undefined && operation.description === undefined) {
          logger.debug('Skipping empty set_metadata operation');
          break;
        }

        const metadataPatch = {
          ...(operation.title !== undefined ? { title: operation.title } : {}),
          ...(operation.description !== undefined ? { description: operation.description } : {}),
        };
        nextDashboardData = {
          ...nextDashboardData,
          ...metadataPatch,
        };
        break;
      }

      case 'upsert_markdown': {
        const markdownResult = upsertMarkdownPanel(
          nextDashboardData.panels,
          operation.markdownContent
        );
        nextDashboardData = {
          ...nextDashboardData,
          panels: markdownResult.panels,
        };

        if (markdownResult.changedPanel) {
          onPanelsAdded([markdownResult.changedPanel]);
        }
        break;
      }

      case 'add_generated_panels': {
        const generatedPanels = await generatePanels(operation.items, (panel) => {
          onPanelsAdded([panel]);
        });
        if (generatedPanels.panels.length > 0) {
          nextDashboardData = {
            ...nextDashboardData,
            panels: [...nextDashboardData.panels, ...generatedPanels.panels],
          };
        }

        failures.push(...generatedPanels.failures);
        break;
      }

      case 'add_panels_from_attachments': {
        const attachmentPanels = await resolvePanelsFromAttachments(operation.attachmentIds);
        if (attachmentPanels.panels.length > 0) {
          nextDashboardData = {
            ...nextDashboardData,
            panels: [...nextDashboardData.panels, ...attachmentPanels.panels],
          };
          onPanelsAdded(attachmentPanels.panels);
        }
        failures.push(...attachmentPanels.failures);
        break;
      }

      case 'remove_panels': {
        const { panelsToKeep, panelsToRemove } = getRemovedPanels(
          nextDashboardData.panels,
          operation.panelIds
        );
        if (panelsToRemove.length > 0) {
          nextDashboardData = {
            ...nextDashboardData,
            panels: panelsToKeep,
          };
          onPanelsRemoved(panelsToRemove);
          logger.debug(`Removed ${panelsToRemove.length} panels from dashboard`);
        }
        break;
      }
    }
  }

  return {
    dashboardData: nextDashboardData,
    failures,
  };
};
