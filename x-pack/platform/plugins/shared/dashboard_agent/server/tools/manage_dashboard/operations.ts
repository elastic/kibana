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
import { toEmbeddablePanel } from '@kbn/dashboard-agent-common';
import {
  appendPanelsToDashboard,
  findPanelById,
  findSectionIndex,
  getWidgetsBottomY,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from './dashboard_state';
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
      'UID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
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
            'UID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
          ),
      })
    )
    .min(1)
    .describe('Visualization attachments to add, each with its dashboard grid layout.'),
});

const visualizationPanelInputSchema = z.object({
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
});

export const addSectionOperationSchema = z.object({
  operation: z.literal('add_section'),
  title: z.string().describe('Section title.'),
  grid: sectionGridSchema,
  panels: z
    .array(visualizationPanelInputSchema)
    .min(1)
    .optional()
    .describe(
      'Optional inline Lens visualization panels to create inside the new section. Panel grids are section-relative.'
    ),
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

const createVisualizationPanelSchema = visualizationPanelInputSchema.extend({
  sectionId: z
    .string()
    .optional()
    .describe(
      'UID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
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

export const editVisualizationPanelsOperationSchema = z
  .object({
    operation: z.literal('edit_visualization_panels'),
    panels: z.array(editVisualizationPanelSchema).min(1),
  })
  .describe(
    'Update existing ES|QL-backed Lens visualization panels by panelId. DSL, form-based, and other non-ES|QL panels are not supported for direct editing and should be recreated as new ES|QL-based Lens panels instead.'
  );

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
            'Move panel to an existing section by its uid. The section must already exist (use add_section first). null promotes to top level. Omit to keep the current location.'
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

type VisualizationPanelInput = z.infer<typeof visualizationPanelInputSchema>;
type CreateVisualizationPanelInput = z.infer<typeof createVisualizationPanelSchema>;
type ResolvedVisualizationPanel = Awaited<ReturnType<ResolveVisualizationConfig>>;
type VisualizationCreationOperationType = 'add_section' | 'create_visualization_panels';
type VisualizationCreationRequest =
  | {
      operationType: 'add_section';
      panelInput: VisualizationPanelInput;
    }
  | {
      operationType: 'create_visualization_panels';
      panelInput: CreateVisualizationPanelInput;
      sectionId?: string;
    };
interface ResolvedVisualizationCreationRequest {
  request: VisualizationCreationRequest;
  resolvedPanel: ResolvedVisualizationPanel;
}

/**
 * Collect inline visualization creation work by operation index so it can be
 * resolved up front in parallel and then applied later in original operation order.
 */
const collectVisualizationCreationRequests = (
  operations: DashboardOperation[]
): Map<number, VisualizationCreationRequest[]> => {
  const requestsByOperationIndex = new Map<number, VisualizationCreationRequest[]>();

  for (const [operationIndex, operation] of operations.entries()) {
    switch (operation.operation) {
      case 'add_section': {
        if (!operation.panels) {
          break;
        }

        requestsByOperationIndex.set(
          operationIndex,
          operation.panels.map((panelInput) => ({
            operationType: operation.operation,
            panelInput,
          }))
        );
        break;
      }
      case 'create_visualization_panels': {
        requestsByOperationIndex.set(
          operationIndex,
          operation.panels.map((panelInput) => ({
            operationType: operation.operation,
            panelInput,
            sectionId: panelInput.sectionId,
          }))
        );
        break;
      }
      default:
        break;
    }
  }

  return requestsByOperationIndex;
};

/**
 * Resolve all collected inline visualization creation requests up front while
 * keeping results grouped by their source operation for ordered application later.
 */
const resolveVisualizationCreationRequests = async ({
  requestsByOperationIndex,
  resolveVisualizationConfig,
}: {
  requestsByOperationIndex: Map<number, VisualizationCreationRequest[]>;
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}): Promise<Map<number, ResolvedVisualizationCreationRequest[]>> => {
  if (requestsByOperationIndex.size === 0) {
    return new Map();
  }

  if (!resolveVisualizationConfig) {
    throw new Error(
      'Inline visualization resolver is required for visualization creation operations.'
    );
  }

  const resolvedRequestsByOperationIndex = await Promise.all(
    Array.from(requestsByOperationIndex.entries()).map(
      async ([operationIndex, requests]): Promise<
        readonly [number, ResolvedVisualizationCreationRequest[]]
      > =>
        [
          operationIndex,
          await Promise.all(
            requests.map(async (request) => ({
              request,
              resolvedPanel: await resolveVisualizationConfig({
                operationType: request.operationType,
                identifier: request.panelInput.query,
                nlQuery: request.panelInput.query,
                index: request.panelInput.index,
                chartType: request.panelInput.chartType,
                esql: request.panelInput.esql,
              }),
            }))
          ),
        ] as const
    )
  );

  return new Map(resolvedRequestsByOperationIndex);
};

/**
 * Return the resolved create results for one operation during the apply phase.
 * Throw if an operation that should have resolved create results does not have them.
 */
const getResolvedVisualizationCreationRequests = ({
  resolvedRequestsByOperationIndex,
  operationIndex,
  operationType,
}: {
  resolvedRequestsByOperationIndex: Map<number, ResolvedVisualizationCreationRequest[]>;
  operationIndex: number;
  operationType: VisualizationCreationOperationType;
}): ResolvedVisualizationCreationRequest[] => {
  const resolvedRequests = resolvedRequestsByOperationIndex.get(operationIndex);

  if (!resolvedRequests) {
    throw new Error(
      `Missing pre-resolved visualization requests for ${operationType} operation at index ${operationIndex}.`
    );
  }

  return resolvedRequests;
};

/**
 * Turn resolved create results into dashboard panels and append any failures.
 * Successful panels are kept even when sibling requests fail.
 */
const materializeResolvedVisualizationPanels = ({
  resolvedRequests,
  failures,
}: {
  resolvedRequests: ResolvedVisualizationCreationRequest[];
  failures: VisualizationFailure[];
}): Array<{ request: VisualizationCreationRequest; panel: AttachmentPanel }> => {
  const successfulPanels: Array<{ request: VisualizationCreationRequest; panel: AttachmentPanel }> =
    [];

  for (const { request, resolvedPanel } of resolvedRequests) {
    if (resolvedPanel.type === 'failure') {
      failures.push(resolvedPanel.failure);
      continue;
    }

    successfulPanels.push({
      request,
      panel: toEmbeddablePanel({
        ...resolvedPanel.visContent,
        grid: request.panelInput.grid,
      }),
    });
  }

  return successfulPanels;
};

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
  const visualizationCreationRequests = collectVisualizationCreationRequests(operations);
  const resolvedVisualizationCreationRequests = await resolveVisualizationCreationRequests({
    requestsByOperationIndex: visualizationCreationRequests,
    resolveVisualizationConfig,
  });

  for (const [operationIndex, operation] of operations.entries()) {
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
        const markdownPanel = toEmbeddablePanel({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: operation.markdownContent },
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
        const panelsToAdd = materializeResolvedVisualizationPanels({
          resolvedRequests: getResolvedVisualizationCreationRequests({
            resolvedRequestsByOperationIndex: resolvedVisualizationCreationRequests,
            operationIndex,
            operationType: operation.operation,
          }),
          failures,
        });

        for (const { request, panel } of panelsToAdd) {
          nextDashboardData = appendPanelsToDashboard({
            dashboardData: nextDashboardData,
            panelsToAdd: [panel],
            sectionId:
              request.operationType === 'create_visualization_panels'
                ? request.sectionId
                : undefined,
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
            existingPanel,
          });

          if (resolvedPanel.type === 'failure') {
            failures.push(resolvedPanel.failure);
            continue;
          }

          const updateResult = updatePanelInDashboard({
            dashboardData: nextDashboardData,
            panelId: panelInput.panelId,
            transformPanel: (panel) => ({
              ...toEmbeddablePanel({
                ...panel,
                ...resolvedPanel.visContent,
              }),
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
        let nextSection: DashboardSection = {
          uid: uuidv4(),
          title: operation.title,
          collapsed: false,
          grid: operation.grid,
          panels: [],
        };

        if (operation.panels) {
          const sectionPanels = materializeResolvedVisualizationPanels({
            resolvedRequests: getResolvedVisualizationCreationRequests({
              resolvedRequestsByOperationIndex: resolvedVisualizationCreationRequests,
              operationIndex,
              operationType: operation.operation,
            }),
            failures,
          }).map(({ panel }) => panel);

          nextSection = {
            ...nextSection,
            panels: sectionPanels,
          };
        }

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
