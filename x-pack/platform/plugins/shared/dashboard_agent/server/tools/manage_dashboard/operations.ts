/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardPinnedPanelState,
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { upsertMarkdownPanel, type DashboardOperationFailure } from './utils';
import type { ResolveControlDataViewIdInput } from './data_view_id_resolver';
import type { DashboardOperation, ManageControlInput } from './operation_schemas';

interface ExecuteDashboardOperationsParams {
  dashboardData: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolveControlDataViewId: (input: ResolveControlDataViewIdInput) => Promise<string>;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => Promise<{ panels: AttachmentPanel[]; failures: DashboardOperationFailure[] }>;
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

const buildControlConfig = ({
  input,
  dataViewId,
}: {
  input: ManageControlInput;
  dataViewId: string;
}): Record<string, unknown> => {
  return {
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
}): Promise<{ controls: DashboardPinnedPanelState[]; failures: DashboardOperationFailure[] }> => {
  const controls: DashboardPinnedPanelState[] = [];
  const failures: DashboardOperationFailure[] = [];

  for (const input of inputs) {
    const controlIdentifier = `${input.type}:${input.fieldName}`;
    let dataViewId: string;
    try {
      dataViewId = await resolveControlDataViewId({
        indexPattern: input.indexPattern,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(
        `Skipping control "${input.type}:${input.fieldName}" because data view could not be resolved: ${errorMessage}`
      );
      failures.push({
        type: 'control_data_view',
        identifier: controlIdentifier,
        error: errorMessage,
      });
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

  return { controls, failures };
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
  failures: DashboardOperationFailure[];
}> => {
  let nextDashboardData = structuredClone(dashboardData);
  const failures: DashboardOperationFailure[] = [];

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
        const { controls: controlsToAdd, failures: controlFailures } =
          await resolvePinnedControlStates({
            inputs: operation.items,
            logger,
            resolveControlDataViewId,
          });
        failures.push(...controlFailures);

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
