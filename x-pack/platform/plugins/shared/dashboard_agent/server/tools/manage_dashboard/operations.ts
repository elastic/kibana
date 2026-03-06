/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import { panelGridSchema, sectionGridSchema } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import {
  extractPanelsById,
  findSectionById,
  getRemovedPanels,
  upsertMarkdownPanel,
  type VisualizationFailure,
} from './utils';

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const upsertMarkdownOperationSchema = z.object({
  operation: z.literal('upsert_markdown'),
  markdownContent: z.string().describe('Markdown content for the dashboard summary panel.'),
});

const attachmentWithGridSchema = z.object({
  attachmentId: z.string().describe('Visualization attachment ID to add as a dashboard panel.'),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
  sectionId: z
    .string()
    .optional()
    .describe('Target section ID. If provided, the panel is added to that section.'),
});

export const addPanelsFromAttachmentsOperationSchema = z.object({
  operation: z.literal('add_panels_from_attachments'),
  items: z
    .array(attachmentWithGridSchema)
    .min(1)
    .describe('Visualization attachments to add, each with its dashboard grid layout.'),
});

export const removePanelsOperationSchema = z.object({
  operation: z.literal('remove_panels'),
  panelIds: z.array(z.string()).min(1).describe('Panel ids to remove from the dashboard.'),
});

export const addSectionOperationSchema = z.object({
  operation: z.literal('add_section'),
  title: z.string().describe('Section title.'),
  grid: sectionGridSchema
    .optional()
    .describe(
      'Vertical position (y) in the outer dashboard grid. A section occupies 1 row. Auto-computed when omitted.'
    ),
  panels: z
    .array(
      z.object({
        attachmentId: z
          .string()
          .describe('Visualization attachment ID to add as a panel in this section.'),
        grid: panelGridSchema.describe(
          'Panel layout relative to the section. Coordinates reset to y:0 per section.'
        ),
      })
    )
    .describe('Panels to place inside the new section. May be empty.'),
});

export const movePanelsToSectionOperationSchema = z.object({
  operation: z.literal('move_panels_to_section'),
  panelIds: z.array(z.string()).min(1).describe('Panel IDs to move.'),
  sectionId: z
    .string()
    .nullable()
    .describe('Target section ID, or null to promote panels to top-level.'),
});

export const removeSectionOperationSchema = z.object({
  operation: z.literal('remove_section'),
  sectionId: z.string().describe('ID of the section to remove.'),
  panelAction: z
    .enum(['promote', 'delete'])
    .describe("'promote' moves panels to top-level; 'delete' removes them."),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  upsertMarkdownOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  removePanelsOperationSchema,
  addSectionOperationSchema,
  movePanelsToSectionOperationSchema,
  removeSectionOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
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

      case 'add_panels_from_attachments': {
        for (const item of operation.items) {
          const result = await resolvePanelsFromAttachments([item.attachmentId]);
          const panelsWithGrid: AttachmentPanel[] = result.panels.map((panel) => ({
            ...panel,
            grid: item.grid,
          }));
          if (panelsWithGrid.length > 0) {
            if (item.sectionId) {
              const section = findSectionById(nextDashboardData, item.sectionId);
              section.panels = [...section.panels, ...panelsWithGrid];
            } else {
              nextDashboardData = {
                ...nextDashboardData,
                panels: [...nextDashboardData.panels, ...panelsWithGrid],
              };
            }
            onPanelsAdded(panelsWithGrid);
          }
          failures.push(...result.failures);
        }
        break;
      }

      case 'remove_panels': {
        const { panelsToKeep, panelsToRemove, updatedSections } = getRemovedPanels(
          nextDashboardData.panels,
          operation.panelIds,
          nextDashboardData.sections
        );
        if (panelsToRemove.length > 0) {
          nextDashboardData = {
            ...nextDashboardData,
            panels: panelsToKeep,
            ...(updatedSections ? { sections: updatedSections } : {}),
          };
          onPanelsRemoved(panelsToRemove);
          logger.debug(`Removed ${panelsToRemove.length} panels from dashboard`);
        }
        break;
      }

      case 'add_section': {
        const sectionId = uuidv4();
        const sectionPanels: AttachmentPanel[] = [];

        for (const item of operation.panels) {
          const result = await resolvePanelsFromAttachments([item.attachmentId]);
          const panelsWithGrid: AttachmentPanel[] = result.panels.map((panel) => ({
            ...panel,
            grid: item.grid,
          }));
          sectionPanels.push(...panelsWithGrid);
          failures.push(...result.failures);
        }

        const sections = nextDashboardData.sections ?? [];
        nextDashboardData = {
          ...nextDashboardData,
          sections: [
            ...sections,
            {
              sectionId,
              title: operation.title,
              collapsed: false,
              ...(operation.grid ? { grid: operation.grid } : {}),
              panels: sectionPanels,
            },
          ],
        };

        if (sectionPanels.length > 0) {
          onPanelsAdded(sectionPanels);
        }
        logger.debug(
          `Added section "${operation.title}" (${sectionId}) with ${sectionPanels.length} panels`
        );
        break;
      }

      case 'move_panels_to_section': {
        const extracted = extractPanelsById(nextDashboardData, operation.panelIds);

        if (operation.sectionId === null) {
          nextDashboardData = {
            ...nextDashboardData,
            panels: [...nextDashboardData.panels, ...extracted],
          };
        } else {
          const section = findSectionById(nextDashboardData, operation.sectionId);
          section.panels = [...section.panels, ...extracted];
        }
        logger.debug(`Moved ${extracted.length} panels to ${operation.sectionId ?? 'top-level'}`);
        break;
      }

      case 'remove_section': {
        const section = findSectionById(nextDashboardData, operation.sectionId);
        const sectionIndex = (nextDashboardData.sections ?? []).indexOf(section);

        if (operation.panelAction === 'promote') {
          nextDashboardData = {
            ...nextDashboardData,
            panels: [...nextDashboardData.panels, ...section.panels],
          };
        } else {
          if (section.panels.length > 0) {
            onPanelsRemoved(section.panels);
          }
        }

        const updatedSections = [...(nextDashboardData.sections ?? [])];
        updatedSections.splice(sectionIndex, 1);
        nextDashboardData = {
          ...nextDashboardData,
          sections: updatedSections,
        };
        logger.debug(
          `Removed section "${section.title}" (${operation.sectionId}), panelAction=${operation.panelAction}`
        );
        break;
      }
    }
  }

  return {
    dashboardData: nextDashboardData,
    failures,
  };
};
