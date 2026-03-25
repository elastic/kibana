/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import { panelGridSchema } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import {
  appendPanelsToDashboard,
  findPanelById,
  findSectionIndex,
  getWidgetsBottomY,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from './dashboard_state';
import { createDashboardPanel } from './panel_content';
import type { ResolveVisualizationConfig } from './inline_visualization';
import { createVisualizationFailureResult } from './inline_visualization';
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

const createVisualizationPanelSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
  sectionId: z
    .string()
    .optional()
    .describe(
      'Optional section ID to add this panel into. If omitted, panel is added at the top level.'
    ),
});

export const createVisualizationPanelsOperationSchema = z.object({
  operation: z.literal('create_visualization_panels'),
  panels: z.array(createVisualizationPanelSchema).min(1),
});

const editVisualizationPanelSchema = z.object({
  panelId: z.string().describe('Existing panel uid to update.'),
  query: z
    .string()
    .describe('A natural language query describing how to update the visualization.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export const editVisualizationPanelsOperationSchema = z.object({
  operation: z.literal('edit_visualization_panels'),
  panels: z.array(editVisualizationPanelSchema).min(1),
});

export const updatePanelLayoutsOperationSchema = z.object({
  operation: z.literal('update_panel_layouts'),
  panels: z
    .array(
      z.object({
        panelId: z.string().describe('UID of the panel to update.'),
        grid: panelGridSchema
          .optional()
          .describe('New grid position/size. Omit to keep the current grid.'),
        sectionId: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Move panel to this section. null promotes to top level. Omit to keep the current location.'
          ),
      })
    )
    .min(1),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  addMarkdownOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  createVisualizationPanelsOperationSchema,
  editVisualizationPanelsOperationSchema,
  updatePanelLayoutsOperationSchema,
  addSectionOperationSchema,
  removeSectionOperationSchema,
  removePanelsOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: VisualizationFailure[] };
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}

export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolvePanelsFromAttachments,
  resolveVisualizationConfig,
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

      case 'add_markdown': {
        const markdownPanel = createDashboardPanel({
          panelContent: {
            type: MARKDOWN_EMBEDDABLE_TYPE,
            config: { content: operation.markdownContent },
          },
          grid: operation.grid,
        });
        nextDashboardData = appendPanelsToDashboard({
          dashboardData: nextDashboardData,
          panelsToAdd: [markdownPanel],
          sectionId: operation.sectionId,
        });

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
            nextDashboardData = appendPanelsToDashboard({
              dashboardData: nextDashboardData,
              panelsToAdd: result.panels,
              sectionId: item.sectionId,
            });
          }
          failures.push(...result.failures);
        }
        break;
      }

      case 'create_visualization_panels': {
        if (!resolveVisualizationConfig) {
          throw new Error(
            'Inline visualization resolver is required for create_visualization_panels operations.'
          );
        }

        const operationResults = await Promise.all(
          operation.panels.map((panelInput) =>
            resolveVisualizationConfig({
              operationType: operation.operation,
              identifier: panelInput.query,
              nlQuery: panelInput.query,
              index: panelInput.index,
              chartType: panelInput.chartType,
              esql: panelInput.esql,
            })
          )
        );

        for (const [panelIndex, panelInput] of operation.panels.entries()) {
          const resolvedPanel = operationResults[panelIndex];
          if (resolvedPanel.type === 'failure') {
            failures.push(resolvedPanel.failure);
            continue;
          }

          nextDashboardData = appendPanelsToDashboard({
            dashboardData: nextDashboardData,
            panelsToAdd: [
              createDashboardPanel({
                panelContent: resolvedPanel.panelContent,
                grid: panelInput.grid,
              }),
            ],
            sectionId: panelInput.sectionId,
          });
        }
        break;
      }

      case 'edit_visualization_panels': {
        if (!resolveVisualizationConfig) {
          throw new Error(
            'Inline visualization resolver is required for edit_visualization_panels operations.'
          );
        }

        for (const panelInput of operation.panels) {
          const existingPanel = findPanelById(nextDashboardData.panels, panelInput.panelId);
          if (!existingPanel) {
            const failureResult = createVisualizationFailureResult(
              operation.operation,
              panelInput.panelId,
              `Panel "${panelInput.panelId}" not found.`
            );
            if (failureResult.type === 'failure') {
              failures.push(failureResult.failure);
            }
            continue;
          }

          const resolvedPanel = await resolveVisualizationConfig({
            operationType: operation.operation,
            identifier: panelInput.panelId,
            nlQuery: panelInput.query,
            chartType: panelInput.chartType,
            esql: panelInput.esql,
            existingPanel: {
              type: existingPanel.type,
              config: existingPanel.config,
            },
          });

          if (resolvedPanel.type === 'failure') {
            failures.push(resolvedPanel.failure);
            continue;
          }

          const updateResult = updatePanelInDashboard({
            dashboardData: nextDashboardData,
            panelId: panelInput.panelId,
            transformPanel: (panel) => ({
              ...panel,
              ...resolvedPanel.panelContent,
            }),
          });

          if (!updateResult.updated) {
            failures.push({
              type: 'edit_visualization_panels',
              identifier: panelInput.panelId,
              error: `Panel "${panelInput.panelId}" not found.`,
            });
            continue;
          }

          nextDashboardData = updateResult.dashboardData;
        }
        break;
      }

      case 'update_panel_layouts': {
        const recordMissingPanelFailure = (panelId: string) => {
          failures.push({
            type: 'update_panel_layouts',
            identifier: panelId,
            error: `Panel "${panelId}" not found.`,
          });
        };

        for (const { panelId, grid, sectionId } of operation.panels) {
          // sectionId omitted: do not move the panel
          if (sectionId === undefined) {
            const updateResult = updatePanelInDashboard({
              dashboardData: nextDashboardData,
              panelId,
              transformPanel: (panel) => ({
                ...panel,
                ...(grid ? { grid } : {}),
              }),
            });

            if (!updateResult.updated) {
              recordMissingPanelFailure(panelId);
              continue;
            }

            nextDashboardData = updateResult.dashboardData;
            continue;
          }
          // sectionId provided: move the panel to that section, or to the top level when null
          const removalResult = removePanelsFromDashboard({
            dashboardData: nextDashboardData,
            panelIdsToRemove: [panelId],
          });
          const { dashboardData: dashboardAfterRemoval, removedPanels } = removalResult;

          if (removedPanels.length === 0) {
            recordMissingPanelFailure(panelId);
            continue;
          }

          const [panelToMove] = removedPanels;
          nextDashboardData = appendPanelsToDashboard({
            dashboardData: dashboardAfterRemoval,
            panelsToAdd: [
              {
                ...panelToMove,
                ...(grid ? { grid } : {}),
              },
            ],
            // sectionId targets a section; null promotes the panel to the top level
            sectionId: sectionId ?? undefined,
          });
        }
        break;
      }

      case 'add_section': {
        const nextSection: DashboardSection = {
          uid: uuidv4(),
          title: operation.title,
          collapsed: false,
          grid: operation.grid,
          panels: [],
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
          panelIdsToRemove: operation.panelIds,
        });
        if (removedPanels.length > 0) {
          nextDashboardData = dashboardWithoutPanels;
          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
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
