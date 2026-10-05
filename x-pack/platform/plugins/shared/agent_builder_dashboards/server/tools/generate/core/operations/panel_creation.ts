/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationFailure } from '../utils';
import type { InlinePanelOperationType, PanelContent } from '../resolve_panel';
import type { DashboardOperation } from './registry';
import type { ResolveAttachmentPanel } from './types';
import {
  buildConfigPanelContent,
  type NewPanelInput,
  type PanelRequestInput,
  type PanelResolutionRequest,
  type ResolvePanelContent,
} from './panels';

type ResolvedPanelContent = Awaited<ReturnType<ResolvePanelContent>>;

export interface MaterializedPanelInput {
  panelContent: PanelContent;
  authoringNote?: string;
}

export interface PanelCreationRequest {
  operationType: 'add_section' | 'add_panels';
  panelInput: PanelRequestInput;
  panelInputIndex: number;
}

export interface ResolvedPanelCreationRequest {
  request: PanelCreationRequest;
  resolvedPanel: ResolvedPanelContent;
}

const collectRequestInputs = (
  operationType: PanelCreationRequest['operationType'],
  panelInputs: NewPanelInput[]
): PanelCreationRequest[] =>
  panelInputs.flatMap((panelInput, panelInputIndex) =>
    panelInput.source === 'request' ? [{ operationType, panelInput, panelInputIndex }] : []
  );

/**
 * Collect inline panel creation work, keyed by operation index, so it can be
 * resolved up front in parallel and applied later in operation order.
 */
const collectPanelCreationRequests = (
  operations: DashboardOperation[]
): Map<number, PanelCreationRequest[]> => {
  const requestsByOperationIndex = new Map<number, PanelCreationRequest[]>();

  for (const [operationIndex, operation] of operations.entries()) {
    const panelRequests =
      operation.operation === 'add_section' || operation.operation === 'add_panels'
        ? collectRequestInputs(operation.operation, operation.panels ?? [])
        : [];

    if (panelRequests.length > 0) {
      requestsByOperationIndex.set(operationIndex, panelRequests);
    }
  }

  return requestsByOperationIndex;
};

/** Maps a new-panel request input onto the resolution request for its renderer. */
const toCreationResolutionRequest = ({
  operationType,
  panelInput,
}: PanelCreationRequest): PanelResolutionRequest => {
  const { query, esql } = panelInput;
  const base = { operationType, identifier: query, nlQuery: query, esql };

  if (panelInput.renderer === 'custom_content') {
    return { ...base, renderer: panelInput.renderer };
  }

  const { renderer, index, chartType } = panelInput;
  return { ...base, renderer, index, chartType };
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
              resolvedPanel: await resolvePanelContent(toCreationResolutionRequest(request)),
            }))
          ),
        ] as const
    )
  );

  return new Map(resolvedRequestsByOperationIndex);
};

/**
 * Turns a new-panel input into panel content so operation handlers don't branch
 * on `source`:
 * - `source: 'config'`: built by value from its panel type's registry entry.
 * - `source: 'attachment'`: read from the conversation's visualization attachment.
 * - `source: 'request'`: read from the up-front parallel resolution (keyed by
 *   panel input index).
 *
 * Returns `undefined` and records a failure when a panel didn't resolve.
 */
export const createPanelInputMaterializer = ({
  resolvedPanelCreationRequests,
  operationIndex,
  operationType,
  failures,
  resolveAttachmentPanel,
}: {
  resolvedPanelCreationRequests: Map<number, ResolvedPanelCreationRequest[]>;
  operationIndex: number;
  operationType: InlinePanelOperationType;
  failures: OperationFailure[];
  resolveAttachmentPanel?: ResolveAttachmentPanel;
}): ((item: NewPanelInput, panelInputIndex: number) => MaterializedPanelInput | undefined) => {
  const resolvedRequestByInputIndex = new Map(
    (resolvedPanelCreationRequests.get(operationIndex) ?? []).map((resolvedRequest) => [
      resolvedRequest.request.panelInputIndex,
      resolvedRequest,
    ])
  );

  return (item, panelInputIndex) => {
    if (item.source === 'config') {
      return { panelContent: buildConfigPanelContent(item.type, item.config) };
    }

    if (item.source === 'attachment') {
      if (!resolveAttachmentPanel) {
        throw new Error('Attachment panel resolver is required for attachment-source panels.');
      }
      const resolved = resolveAttachmentPanel(item.attachment_id, operationType);
      if (resolved.type === 'failure') {
        failures.push(resolved.failure);
        return undefined;
      }
      return { panelContent: resolved.panelContent };
    }

    const resolvedRequest = resolvedRequestByInputIndex.get(panelInputIndex);
    if (!resolvedRequest) {
      throw new Error(
        `Missing pre-resolved panel request for ${operationType} operation at index ${operationIndex}, panel input index ${panelInputIndex}.`
      );
    }

    if (resolvedRequest.resolvedPanel.type === 'failure') {
      failures.push(resolvedRequest.resolvedPanel.failure);
      return undefined;
    }

    return {
      panelContent: resolvedRequest.resolvedPanel.panelContent,
      ...(resolvedRequest.resolvedPanel.authoringNote
        ? { authoringNote: resolvedRequest.resolvedPanel.authoringNote }
        : {}),
    };
  };
};
