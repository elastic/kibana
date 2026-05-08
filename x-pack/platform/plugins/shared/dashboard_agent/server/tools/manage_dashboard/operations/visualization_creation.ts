/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolveVisualizationConfig } from '../inline_visualization';
import type { DashboardOperation } from './registry';
import type { AddPanelsItemInput } from './add_panels';
import type { VisualizationPanelInput } from './panel_kinds';

type ResolvedVisualizationPanel = Awaited<ReturnType<ResolveVisualizationConfig>>;
export type VisualizationCreationOperationType = 'add_section' | 'add_panels';
export type VisualizationCreationRequest =
  | {
      operationType: 'add_section';
      panelInput: VisualizationPanelInput;
      panelInputIndex: number;
    }
  | {
      operationType: 'add_panels';
      panelInput: Extract<AddPanelsItemInput, { kind: 'visualization' }>;
      panelInputIndex: number;
      sectionId?: string;
    };

export interface ResolvedVisualizationCreationRequest {
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

        const visualizationRequests = operation.panels.flatMap((panelInput, panelInputIndex) =>
          panelInput.kind === 'visualization'
            ? [
                {
                  operationType: operation.operation,
                  panelInput,
                  panelInputIndex,
                },
              ]
            : []
        );

        if (visualizationRequests.length > 0) {
          requestsByOperationIndex.set(operationIndex, visualizationRequests);
        }
        break;
      }
      case 'add_panels': {
        const visualizationRequests = operation.panels.flatMap((panelInput, panelInputIndex) =>
          panelInput.kind === 'visualization'
            ? [
                {
                  operationType: operation.operation,
                  panelInput,
                  panelInputIndex,
                  sectionId: panelInput.sectionId,
                },
              ]
            : []
        );

        if (visualizationRequests.length > 0) {
          requestsByOperationIndex.set(operationIndex, visualizationRequests);
        }
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
export const resolveVisualizationCreationRequests = async ({
  operations,
  resolveVisualizationConfig,
}: {
  operations: DashboardOperation[];
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}): Promise<Map<number, ResolvedVisualizationCreationRequest[]>> => {
  const requestsByOperationIndex = collectVisualizationCreationRequests(operations);

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
