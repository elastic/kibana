/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import { isSection, panelGridSchema } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import type { VisualizationFailure } from './utils';

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const addMarkdownOperationSchema = z.object({
  operation: z.literal('add_markdown'),
  markdownContent: z.string().describe('Markdown content for the panel.'),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row.'
  ),
  sectionId: z
    .string()
    .optional()
    .describe(
      'Optional section ID to add this panel into. If omitted, panel is added at the top level.'
    ),
});

const attachmentWithGridSchema = z.object({
  attachmentId: z.string().describe('Visualization attachment ID to add as a dashboard panel.'),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
});

const sectionGridSchema = z.object({
  y: z.number().int().min(0).describe('Section position in outer dashboard grid coordinates.'),
});

export const addPanelsFromAttachmentsOperationSchema = z.object({
  operation: z.literal('add_panels_from_attachments'),
  items: z
    .array(
      attachmentWithGridSchema.extend({
        sectionId: z
          .string()
          .optional()
          .describe(
            'Optional section ID to add this panel into. If omitted, panel is added at the top level.'
          ),
      })
    )
    .min(1)
    .describe('Visualization attachments to add, each with its dashboard grid layout.'),
});

export const addSectionOperationSchema = z.object({
  operation: z.literal('add_section'),
  title: z.string().describe('Section title.'),
  grid: sectionGridSchema,
  panels: z
    .array(attachmentWithGridSchema)
    .describe('Panels to create inside the section. Coordinates are section-relative.'),
});

export const removeSectionOperationSchema = z.object({
  operation: z.literal('remove_section'),
  uid: z.string().describe('Section uid to remove.'),
  panelAction: z
    .enum(['promote', 'delete'])
    .describe('How to handle section panels: promote to top-level or delete them.'),
});

export const removePanelsOperationSchema = z.object({
  operation: z.literal('remove_panels'),
  panelIds: z.array(z.string()).min(1).describe('Panel ids to remove from the dashboard.'),
});

export const updatePanelsFromAttachmentsOperationSchema = z.object({
  operation: z.literal('update_panels_from_attachments'),
  attachmentIds: z
    .array(z.string())
    .min(1)
    .describe(
      'Visualization attachment IDs whose dashboard panels should be refreshed with the latest attachment data.'
    ),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  addMarkdownOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  addSectionOperationSchema,
  removeSectionOperationSchema,
  removePanelsOperationSchema,
  updatePanelsFromAttachmentsOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: VisualizationFailure[] };
}

type DashboardWidget = AttachmentPanel | DashboardSection;

const getWidgetsBottomY = (widgets: DashboardWidget[]): number => {
  return widgets.reduce((maxY, widget) => {
    if (isSection(widget)) {
      // Sections only have y in grid, no height - use panels inside
      const sectionBottom = widget.panels.reduce(
        (sectionMaxY, panel) => Math.max(sectionMaxY, widget.grid.y + panel.grid.y + panel.grid.h),
        widget.grid.y
      );
      return Math.max(maxY, sectionBottom);
    }
    return Math.max(maxY, widget.grid.y + widget.grid.h);
  }, 0);
};

const findSectionIndex = (panels: DashboardWidget[], sectionId: string): number => {
  return panels.findIndex((widget) => isSection(widget) && widget.uid === sectionId);
};

const updateSectionPanels = (
  panels: DashboardWidget[],
  sectionId: string,
  updateFn: (sectionPanels: AttachmentPanel[]) => AttachmentPanel[]
): DashboardWidget[] => {
  return panels.map((widget) => {
    if (isSection(widget) && widget.uid === sectionId) {
      return { ...widget, panels: updateFn(widget.panels) };
    }
    return widget;
  });
};

const removePanelsFromDashboard = ({
  dashboardData,
  panelIds,
}: {
  dashboardData: DashboardAttachmentData;
  panelIds: string[];
}): {
  dashboardData: DashboardAttachmentData;
  removedPanels: AttachmentPanel[];
} => {
  const panelIdSet = new Set(panelIds);
  const removedPanels: AttachmentPanel[] = [];
  const nextPanels: DashboardWidget[] = [];

  for (const widget of dashboardData.panels) {
    if (isSection(widget)) {
      const sectionPanelsToKeep: AttachmentPanel[] = [];
      for (const panel of widget.panels) {
        if (panelIdSet.has(panel.uid)) {
          removedPanels.push(panel);
        } else {
          sectionPanelsToKeep.push(panel);
        }
      }
      nextPanels.push({ ...widget, panels: sectionPanelsToKeep });
    } else {
      if (panelIdSet.has(widget.uid)) {
        removedPanels.push(widget);
      } else {
        nextPanels.push(widget);
      }
    }
  }

  return {
    dashboardData: {
      ...dashboardData,
      panels: nextPanels,
    },
    removedPanels,
  };
};

export const executeDashboardOperations = ({
  dashboardData,
  operations,
  logger,
  resolvePanelsFromAttachments,
}: ExecuteDashboardOperationsParams): {
  dashboardData: DashboardAttachmentData;
  failures: VisualizationFailure[];
} => {
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

      case 'add_markdown': {
        const markdownPanel: AttachmentPanel = {
          type: MARKDOWN_EMBEDDABLE_TYPE,
          uid: uuidv4(),
          config: { content: operation.markdownContent },
          grid: operation.grid,
        };

        if (operation.sectionId) {
          const sectionIndex = findSectionIndex(nextDashboardData.panels, operation.sectionId);
          if (sectionIndex === -1) {
            throw new Error(`Section "${operation.sectionId}" not found.`);
          }

          nextDashboardData = {
            ...nextDashboardData,
            panels: updateSectionPanels(
              nextDashboardData.panels,
              operation.sectionId,
              (sectionPanels) => [...sectionPanels, markdownPanel]
            ),
          };
        } else {
          nextDashboardData = {
            ...nextDashboardData,
            panels: [...nextDashboardData.panels, markdownPanel],
          };
        }

        break;
      }

      case 'add_panels_from_attachments': {
        for (const item of operation.items) {
          const result = resolvePanelsFromAttachments([
            {
              attachmentId: item.attachmentId,
              grid: item.grid,
            },
          ]);
          if (result.panels.length > 0) {
            if (item.sectionId) {
              const sectionIndex = findSectionIndex(nextDashboardData.panels, item.sectionId);
              if (sectionIndex === -1) {
                throw new Error(`Section "${item.sectionId}" not found.`);
              }

              nextDashboardData = {
                ...nextDashboardData,
                panels: updateSectionPanels(
                  nextDashboardData.panels,
                  item.sectionId,
                  (sectionPanels) => [...sectionPanels, ...result.panels]
                ),
              };
            } else {
              nextDashboardData = {
                ...nextDashboardData,
                panels: [...nextDashboardData.panels, ...result.panels],
              };
            }
          }
          failures.push(...result.failures);
        }
        break;
      }

      case 'add_section': {
        const sectionPanels: AttachmentPanel[] = [];
        for (const panelInput of operation.panels) {
          const result = resolvePanelsFromAttachments([
            {
              attachmentId: panelInput.attachmentId,
              grid: panelInput.grid,
            },
          ]);
          if (result.panels.length > 0) {
            sectionPanels.push(...result.panels);
          }
          failures.push(...result.failures);
        }

        const nextSection: DashboardSection = {
          uid: uuidv4(),
          title: operation.title,
          collapsed: false,
          grid: operation.grid,
          panels: sectionPanels,
        };

        nextDashboardData = {
          ...nextDashboardData,
          panels: [...nextDashboardData.panels, nextSection],
        };
        break;
      }

      case 'remove_section': {
        const sectionIndex = findSectionIndex(nextDashboardData.panels, operation.uid);
        if (sectionIndex === -1) {
          throw new Error(`Section "${operation.uid}" not found.`);
        }

        const sectionToRemove = nextDashboardData.panels[sectionIndex] as DashboardSection;
        const nextPanels = nextDashboardData.panels.filter((_, i) => i !== sectionIndex);

        if (operation.panelAction === 'delete') {
          nextDashboardData = {
            ...nextDashboardData,
            panels: nextPanels,
          };
          break;
        }

        const baseY = getWidgetsBottomY(nextPanels);
        const promotedPanels = sectionToRemove.panels.map((panel) => ({
          ...panel,
          grid: {
            ...panel.grid,
            y: baseY + panel.grid.y,
          },
        }));

        nextDashboardData = {
          ...nextDashboardData,
          panels: [...nextPanels, ...promotedPanels],
        };
        break;
      }

      case 'remove_panels': {
        const { dashboardData: dashboardWithoutPanels, removedPanels } = removePanelsFromDashboard({
          dashboardData: nextDashboardData,
          panelIds: operation.panelIds,
        });
        if (removedPanels.length > 0) {
          nextDashboardData = dashboardWithoutPanels;
          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
        }
        break;
      }

      case 'update_panels_from_attachments': {
        const attachmentIdSet = new Set(operation.attachmentIds);

        const updatePanel = (panel: AttachmentPanel): AttachmentPanel => {
          if (!panel.sourceAttachmentId || !attachmentIdSet.has(panel.sourceAttachmentId)) {
            return panel;
          }

          try {
            const result = resolvePanelsFromAttachments([
              { attachmentId: panel.sourceAttachmentId, grid: panel.grid },
            ]);
            failures.push(...result.failures);

            if (result.panels.length === 0) {
              return panel;
            }

            const updatedPanel = {
              ...result.panels[0],
              uid: panel.uid,
              grid: panel.grid,
            };

            return updatedPanel;
          } catch (error) {
            logger.error(
              `Failed to update panel "${panel.uid}" from attachment "${
                panel.sourceAttachmentId
              }": ${error instanceof Error ? error.message : String(error)}`
            );
            failures.push({
              type: 'update_panels',
              identifier: panel.sourceAttachmentId,
              error: error instanceof Error ? error.message : String(error),
            });
            return panel;
          }
        };

        const updatedPanels: DashboardWidget[] = nextDashboardData.panels.map((widget) => {
          if (isSection(widget)) {
            return {
              ...widget,
              panels: widget.panels.map(updatePanel),
            };
          }
          return updatePanel(widget);
        });

        nextDashboardData = {
          ...nextDashboardData,
          panels: updatedPanels,
        };
        break;
      }
    }
  }

  return {
    dashboardData: nextDashboardData,
    failures,
  };
};
