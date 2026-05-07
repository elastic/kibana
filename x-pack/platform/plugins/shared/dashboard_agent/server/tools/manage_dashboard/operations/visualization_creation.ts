/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import type { ResolveVisualizationConfig } from '../inline_visualization';
import type { VisualizationFailure } from '../utils';
import type {
  InlineVisualizationAddPanelInput,
  InlineVisualizationSectionPanelInput,
} from './panel_sources';

type ResolvedVisualizationPanel = Awaited<ReturnType<ResolveVisualizationConfig>>;
export type VisualizationCreationOperationType = 'add_section' | 'add_panels';
export type VisualizationCreationRequest =
  | {
      operationType: 'add_section';
      panelInput: InlineVisualizationSectionPanelInput;
      panelIndex: number;
    }
  | {
      operationType: 'add_panels';
      panelInput: InlineVisualizationAddPanelInput;
      panelIndex: number;
      sectionId?: string;
    };

export interface ResolvedVisualizationCreationRequest {
  request: VisualizationCreationRequest;
  resolvedPanel: ResolvedVisualizationPanel;
}

/**
 * Resolve all collected inline visualization creation requests up front while
 * keeping results grouped by their source operation for ordered application later.
 */
export const resolveVisualizationCreationRequests = async ({
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
export const getResolvedVisualizationCreationRequests = ({
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
export const materializeResolvedVisualizationPanels = ({
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
      panel: {
        id: uuidv4(),
        type: resolvedPanel.visContent.type,
        config: resolvedPanel.visContent.config,
        grid: request.panelInput.grid,
      },
    });
  }

  return successfulPanels;
};
