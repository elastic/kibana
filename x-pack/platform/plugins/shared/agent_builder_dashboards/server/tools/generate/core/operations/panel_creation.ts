/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvePanelContent } from '../resolve_panel';
import type { DashboardOperation } from './registry';
import type { AddPanelsItemInput, PanelRequestInput } from './panels';

type ResolvedPanelContent = Awaited<ReturnType<ResolvePanelContent>>;

export type PanelCreationRequest =
  | {
      operationType: 'add_section';
      panelInput: PanelRequestInput;
      panelInputIndex: number;
    }
  | {
      operationType: 'add_panels';
      panelInput: Extract<AddPanelsItemInput, { kind: 'panelRequest' }>;
      panelInputIndex: number;
      sectionId?: string;
    };

export interface ResolvedPanelCreationRequest {
  request: PanelCreationRequest;
  resolvedPanel: ResolvedPanelContent;
}

/**
 * Collect inline panel creation work by operation index so it can be
 * resolved up front in parallel and then applied later in original operation order.
 */
const collectPanelCreationRequests = (
  operations: DashboardOperation[]
): Map<number, PanelCreationRequest[]> => {
  const requestsByOperationIndex = new Map<number, PanelCreationRequest[]>();

  for (const [operationIndex, operation] of operations.entries()) {
    switch (operation.operation) {
      case 'add_section': {
        if (!operation.panels) {
          break;
        }

        const panelRequests = operation.panels.flatMap((panelInput, panelInputIndex) =>
          panelInput.kind === 'panelRequest'
            ? [
                {
                  operationType: operation.operation,
                  panelInput,
                  panelInputIndex,
                },
              ]
            : []
        );

        if (panelRequests.length > 0) {
          requestsByOperationIndex.set(operationIndex, panelRequests);
        }
        break;
      }
      case 'add_panels': {
        const panelRequests = operation.panels.flatMap((panelInput, panelInputIndex) =>
          panelInput.kind === 'panelRequest'
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

        if (panelRequests.length > 0) {
          requestsByOperationIndex.set(operationIndex, panelRequests);
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
 * Resolve all collected inline panel creation requests up front while keeping
 * results grouped by their source operation for ordered application later.
 */
export const resolvePanelCreationRequests = async ({
  operations,
  resolvePanelContent,
}: {
  operations: DashboardOperation[];
  resolvePanelContent?: ResolvePanelContent;
}): Promise<Map<number, ResolvedPanelCreationRequest[]>> => {
  const requestsByOperationIndex = collectPanelCreationRequests(operations);

  if (requestsByOperationIndex.size === 0) {
    return new Map();
  }

  if (!resolvePanelContent) {
    throw new Error('Inline panel resolver is required for panel creation operations.');
  }

  const resolvedRequestsByOperationIndex = await Promise.all(
    Array.from(requestsByOperationIndex.entries()).map(
      async ([operationIndex, requests]): Promise<
        readonly [number, ResolvedPanelCreationRequest[]]
      > =>
        [
          operationIndex,
          await Promise.all(
            requests.map(async (request) => ({
              request,
              resolvedPanel: await resolvePanelContent({
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
 * Returns an empty array for operations with no panel requests.
 */
export const getResolvedPanelCreationRequests = ({
  resolvedRequestsByOperationIndex,
  operationIndex,
}: {
  resolvedRequestsByOperationIndex: Map<number, ResolvedPanelCreationRequest[]>;
  operationIndex: number;
}): ResolvedPanelCreationRequest[] => resolvedRequestsByOperationIndex.get(operationIndex) ?? [];
