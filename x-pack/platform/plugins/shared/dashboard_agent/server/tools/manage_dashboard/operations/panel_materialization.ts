/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import type { PanelResolutionFailure, VisualizationFailure } from '../utils';
import type { OperationExecutionContext } from './types';
import type {
  AddPanelInput,
  InlineVisualizationAddPanelInput,
  InlineVisualizationSectionPanelInput,
  SectionPanelInput,
} from './panel_sources';
import {
  getResolvedVisualizationCreationRequests,
  materializeResolvedVisualizationPanels,
  type VisualizationCreationOperationType,
  type VisualizationCreationRequest,
} from './visualization_creation';

type PanelInput = AddPanelInput | SectionPanelInput;

interface MaterializedPanel<TPanelInput extends PanelInput> {
  panel: AttachmentPanel;
  panelInput: TPanelInput;
  panelIndex: number;
  sectionId?: string;
}

const getPanelSectionId = (panelInput: PanelInput): string | undefined =>
  'sectionId' in panelInput ? panelInput.sectionId : undefined;

const normalizeFailures = (
  failures: PanelResolutionFailure[],
  operationType: VisualizationCreationOperationType
): VisualizationFailure[] =>
  failures.map((failure) => ({
    ...failure,
    type: operationType,
  }));

export const collectVisualizationCreationRequestsForPanels = (
  params:
    | { operationType: 'add_panels'; panels: AddPanelInput[] }
    | { operationType: 'add_section'; panels: SectionPanelInput[] }
): VisualizationCreationRequest[] => {
  const { operationType, panels } = params;

  return panels.flatMap((panelInput, panelIndex): VisualizationCreationRequest[] => {
    if (panelInput.source !== 'inline_visualization') {
      return [];
    }

    if (operationType === 'add_panels') {
      const addPanelInput = panelInput as InlineVisualizationAddPanelInput;
      return [
        {
          operationType,
          panelInput: addPanelInput,
          panelIndex,
          sectionId: addPanelInput.sectionId,
        },
      ];
    }

    return [
      {
        operationType,
        panelInput: panelInput as InlineVisualizationSectionPanelInput,
        panelIndex,
      },
    ];
  });
};

export const materializePanelInputs = <TPanelInput extends PanelInput>({
  panelInputs,
  operationIndex,
  operationType,
  context,
}: {
  panelInputs: TPanelInput[];
  operationIndex: number;
  operationType: VisualizationCreationOperationType;
  context: OperationExecutionContext;
}): Array<MaterializedPanel<TPanelInput>> => {
  const materializedPanels: Array<MaterializedPanel<TPanelInput>> = [];
  const inlinePanelByInputIndex = new Map<number, AttachmentPanel>();
  const hasInlineVisualizationPanels = panelInputs.some(
    (panelInput) => panelInput.source === 'inline_visualization'
  );

  if (hasInlineVisualizationPanels) {
    const resolvedInlinePanels = materializeResolvedVisualizationPanels({
      resolvedRequests: getResolvedVisualizationCreationRequests({
        resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
        operationIndex,
        operationType,
      }),
      failures: context.failures,
    });

    for (const { request, panel } of resolvedInlinePanels) {
      inlinePanelByInputIndex.set(request.panelIndex, panel);
    }
  }

  for (const [panelIndex, panelInput] of panelInputs.entries()) {
    const sectionId = getPanelSectionId(panelInput);

    if (panelInput.source === 'markdown') {
      materializedPanels.push({
        panel: {
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: panelInput.content },
          grid: panelInput.grid,
          id: uuidv4(),
        },
        panelInput,
        panelIndex,
        sectionId,
      });
      continue;
    }

    if (panelInput.source === 'attachment') {
      const result = context.resolvePanelsFromAttachments([
        {
          attachmentId: panelInput.attachmentId,
          grid: panelInput.grid,
        },
      ]);

      context.failures.push(...normalizeFailures(result.failures, operationType));
      materializedPanels.push(
        ...result.panels.map((panel) => ({
          panel,
          panelInput,
          panelIndex,
          sectionId,
        }))
      );
      continue;
    }

    const inlinePanel = inlinePanelByInputIndex.get(panelIndex);
    if (inlinePanel) {
      materializedPanels.push({
        panel: inlinePanel,
        panelInput,
        panelIndex,
        sectionId,
      });
    }
  }

  return materializedPanels;
};

export const recordMissingSectionFailure = ({
  context,
  operationType,
  sectionId,
  panelDescription,
}: {
  context: OperationExecutionContext;
  operationType: 'add_panels';
  sectionId: string;
  panelDescription: string;
}) => {
  context.failures.push({
    type: operationType,
    identifier: sectionId,
    error: `Section "${sectionId}" not found for ${panelDescription}.`,
  });
};
