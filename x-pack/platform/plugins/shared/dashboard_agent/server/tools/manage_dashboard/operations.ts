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
  DashboardPinnedPanelState,
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import { panelGridSchema } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { upsertMarkdownPanel, type VisualizationFailure } from './utils';
import type { ResolveControlDataViewIdInput } from './data_view_id_resolver';

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
});

const sectionGridSchema = z.object({
  y: z.number().int().min(0).describe('Section position in outer dashboard grid coordinates.'),
});

const controlTypeSchema = z.enum(['optionsListControl', 'rangeSliderControl']);
const controlWidthSchema = z.enum(['small', 'medium', 'large']);

const manageControlInputSchema = z.object({
  type: controlTypeSchema,
  fieldName: z.string().describe('Field name used by the control.'),
  dataViewId: z.string().optional().describe('Data view id (preferred when known).'),
  dataViewTitle: z.string().optional().describe('Data view title to resolve server-side.'),
  indexPattern: z.string().optional().describe('Index pattern title to resolve server-side.'),
  title: z.string().optional().describe('Optional control title.'),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
  settings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional control config settings.'),
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
  sectionId: z.string().describe('Section id to remove.'),
  panelAction: z
    .enum(['promote', 'delete'])
    .describe('How to handle section panels: promote to top-level or delete them.'),
});

export const removePanelsOperationSchema = z.object({
  operation: z.literal('remove_panels'),
  panelIds: z.array(z.string()).min(1).describe('Panel ids to remove from the dashboard.'),
});

export const addControlsOperationSchema = z.object({
  operation: z.literal('add_controls'),
  items: z
    .array(manageControlInputSchema)
    .min(1)
    .describe('Controls to append to pinned controls.'),
});

export const removeControlsOperationSchema = z.object({
  operation: z.literal('remove_controls'),
  controlIds: z.array(z.string()).min(1).describe('Control uid values to remove.'),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  upsertMarkdownOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  addSectionOperationSchema,
  removeSectionOperationSchema,
  removePanelsOperationSchema,
  addControlsOperationSchema,
  removeControlsOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolveControlDataViewId: (input: ResolveControlDataViewIdInput) => Promise<string>;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => Promise<{ panels: AttachmentPanel[]; failures: VisualizationFailure[] }>;
  onPanelsAdded: (panels: AttachmentPanel[]) => void;
  onPanelsRemoved: (panels: AttachmentPanel[]) => void;
}

const asOptionalSections = (
  sections: DashboardSection[] | undefined
): DashboardSection[] | undefined => {
  return sections && sections.length > 0 ? sections : undefined;
};

const asOptionalPinnedPanels = (
  pinnedPanels: DashboardPinnedPanelState[] | undefined
): DashboardPinnedPanelState[] | undefined => {
  return pinnedPanels && pinnedPanels.length > 0 ? pinnedPanels : undefined;
};

const getPanelsBottomY = (panels: AttachmentPanel[]): number => {
  return panels.reduce((maxY, panel) => Math.max(maxY, panel.grid.y + panel.grid.h), 0);
};

type ManageControlInput = z.infer<typeof manageControlInputSchema>;

const buildControlConfig = ({
  input,
  dataViewId,
}: {
  input: ManageControlInput;
  dataViewId: string;
}): Record<string, unknown> => {
  return {
    ...(input.settings ?? {}),
    data_view_id: dataViewId,
    field_name: input.fieldName,
    ...(input.title !== undefined ? { title: input.title } : {}),
  };
};

const resolvePinnedControlStates = async ({
  inputs,
  logger,
  resolveControlDataViewId,
}: {
  inputs: ManageControlInput[];
  logger: Logger;
  resolveControlDataViewId: ExecuteDashboardOperationsParams['resolveControlDataViewId'];
}): Promise<DashboardPinnedPanelState[]> => {
  const controls: DashboardPinnedPanelState[] = [];

  for (const input of inputs) {
    let dataViewId: string;
    try {
      dataViewId = await resolveControlDataViewId({
        dataViewId: input.dataViewId,
        dataViewTitle: input.dataViewTitle,
        indexPattern: input.indexPattern,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(
        `Skipping control "${input.type}:${input.fieldName}" because data view could not be resolved: ${errorMessage}`
      );
      continue;
    }
    const config = buildControlConfig({
      input,
      dataViewId,
    });

    controls.push({
      type: input.type,
      uid: uuidv4(),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.grow !== undefined ? { grow: input.grow } : {}),
      config,
    } as DashboardPinnedPanelState);
  }

  return controls;
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
  const topLevelPanelsToKeep: AttachmentPanel[] = [];

  for (const panel of dashboardData.panels) {
    if (panelIdSet.has(panel.panelId)) {
      removedPanels.push(panel);
    } else {
      topLevelPanelsToKeep.push(panel);
    }
  }

  const nextSections = (dashboardData.sections ?? []).map((section) => {
    const sectionPanelsToKeep: AttachmentPanel[] = [];
    for (const panel of section.panels) {
      if (panelIdSet.has(panel.panelId)) {
        removedPanels.push(panel);
      } else {
        sectionPanelsToKeep.push(panel);
      }
    }
    return {
      ...section,
      panels: sectionPanelsToKeep,
    };
  });

  return {
    dashboardData: {
      ...dashboardData,
      panels: topLevelPanelsToKeep,
      sections: asOptionalSections(nextSections),
    },
    removedPanels,
  };
};

export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolveControlDataViewId,
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
          const result = await resolvePanelsFromAttachments([
            {
              attachmentId: item.attachmentId,
              grid: item.grid,
            },
          ]);
          if (result.panels.length > 0) {
            if (item.sectionId) {
              const sectionIndex = (nextDashboardData.sections ?? []).findIndex(
                ({ sectionId }) => sectionId === item.sectionId
              );
              if (sectionIndex === -1) {
                throw new Error(`Section "${item.sectionId}" not found.`);
              }

              const sections = [...(nextDashboardData.sections ?? [])];
              sections[sectionIndex] = {
                ...sections[sectionIndex],
                panels: [...sections[sectionIndex].panels, ...result.panels],
              };
              nextDashboardData = {
                ...nextDashboardData,
                sections: asOptionalSections(sections),
              };
            } else {
              nextDashboardData = {
                ...nextDashboardData,
                panels: [...nextDashboardData.panels, ...result.panels],
              };
            }
            onPanelsAdded(result.panels);
          }
          failures.push(...result.failures);
        }
        break;
      }

      case 'add_section': {
        const sectionPanels: AttachmentPanel[] = [];
        for (const panelInput of operation.panels) {
          const result = await resolvePanelsFromAttachments([
            {
              attachmentId: panelInput.attachmentId,
              grid: panelInput.grid,
            },
          ]);
          if (result.panels.length > 0) {
            sectionPanels.push(...result.panels);
            onPanelsAdded(result.panels);
          }
          failures.push(...result.failures);
        }

        const nextSection: DashboardSection = {
          sectionId: uuidv4(),
          title: operation.title,
          collapsed: false,
          grid: operation.grid,
          panels: sectionPanels,
        };

        nextDashboardData = {
          ...nextDashboardData,
          sections: [...(nextDashboardData.sections ?? []), nextSection],
        };
        break;
      }

      case 'remove_section': {
        const sectionIndex = (nextDashboardData.sections ?? []).findIndex(
          ({ sectionId }) => sectionId === operation.sectionId
        );
        if (sectionIndex === -1) {
          throw new Error(`Section "${operation.sectionId}" not found.`);
        }

        const sections = [...(nextDashboardData.sections ?? [])];
        const sectionToRemove = sections[sectionIndex];
        sections.splice(sectionIndex, 1);

        if (operation.panelAction === 'delete') {
          if (sectionToRemove.panels.length > 0) {
            onPanelsRemoved(sectionToRemove.panels);
          }
          nextDashboardData = {
            ...nextDashboardData,
            sections: asOptionalSections(sections),
          };
          break;
        }

        const baseY = getPanelsBottomY(nextDashboardData.panels);
        const promotedPanels = sectionToRemove.panels.map((panel) => ({
          ...panel,
          grid: {
            ...panel.grid,
            y: baseY + panel.grid.y,
          },
        }));

        nextDashboardData = {
          ...nextDashboardData,
          panels: [...nextDashboardData.panels, ...promotedPanels],
          sections: asOptionalSections(sections),
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
          onPanelsRemoved(removedPanels);
          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
        }
        break;
      }

      case 'add_controls': {
        const existingControls = nextDashboardData.pinnedPanels ?? [];
        const controlsToAdd = await resolvePinnedControlStates({
          inputs: operation.items,
          logger,
          resolveControlDataViewId,
        });

        nextDashboardData = {
          ...nextDashboardData,
          pinnedPanels: asOptionalPinnedPanels([...existingControls, ...controlsToAdd]),
        };
        break;
      }

      case 'remove_controls': {
        const existingControls = nextDashboardData.pinnedPanels ?? [];
        if (existingControls.length === 0) {
          break;
        }

        const removeControlIdSet = new Set(operation.controlIds);
        const nextControls = existingControls.filter(({ uid }) => !removeControlIdSet.has(uid));
        if (nextControls.length !== existingControls.length) {
          nextDashboardData = {
            ...nextDashboardData,
            pinnedPanels: asOptionalPinnedPanels(nextControls),
          };
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
