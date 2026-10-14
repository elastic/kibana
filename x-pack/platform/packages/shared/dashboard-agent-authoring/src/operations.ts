/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import type { ResolvePanelContent } from './operations/panels';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from './operations/types';
import type { OperationFailure } from './utils';
import type { PanelAuthoringNote } from './resolve_panel';
import { discardInvalidChanges, type DashboardValidator } from './validate_dashboard';
import {
  dashboardOperationSchema,
  executeOperationHandler,
  prepareOperationExecution,
  type DashboardOperation,
} from './operations/registry';

export { dashboardOperationSchema };
export type { DashboardOperation };

interface ExecuteDashboardOperationsParams {
  dashboardData?: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  validator?: DashboardValidator;
}

/**
 * Environment-agnostic dashboard generation: turns a prior dashboard payload (or
 * an empty one) plus an ordered list of operations into a new payload. Identity,
 * persistence, and result shape belong to the calling tool. Inline panel content
 * is resolved via the injected `resolvePanelContent` callback, so the core never
 * reads any store. Control fields are validated against index mappings when
 * the host provides `resolveControlFieldCapabilities`. New panels and sections
 * are placed below the existing ones, two panels per row, until the host arranges
 * the layout. When the host provides a `validator`, changes that make the
 * dashboard invalid are discarded and reported as failures.
 */
export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolvePanelContent,
  resolveAttachmentPanel,
  resolveControlFieldCapabilities,
  validator,
}: ExecuteDashboardOperationsParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
  /** Existing panels whose content was edited and kept. */
  editedPanelIds: ReadonlySet<string>;
}> => {
  const originalDashboardData = structuredClone(
    dashboardData ?? {
      title: 'User Dashboard',
      description: undefined,
      panels: [],
    }
  );
  let nextDashboardData = structuredClone(originalDashboardData);
  const failures: OperationFailure[] = [];
  const panelAuthoringNotes: PanelAuthoringNote[] = [];

  const context = await prepareOperationExecution({
    operations,
    logger,
    resolvePanelContent,
    resolveAttachmentPanel,
    resolveControlFieldCapabilities,
    failures,
    panelAuthoringNotes,
  });

  for (const [operationIndex, operation] of operations.entries()) {
    nextDashboardData = await executeOperationHandler({
      dashboardData: nextDashboardData,
      operation,
      operationIndex,
      context,
    });
  }

  if (!validator) {
    return {
      dashboardData: nextDashboardData,
      failures,
      panelAuthoringNotes,
      editedPanelIds: context.editedPanelIds,
    };
  }

  const validationResult = discardInvalidChanges({
    originalDashboardData,
    dashboardData: nextDashboardData,
    validator,
  });

  const isKept = (panelId: string) => !validationResult.discardedPanelIds.has(panelId);
  return {
    dashboardData: validationResult.dashboardData,
    failures: [...failures, ...validationResult.failures],
    panelAuthoringNotes: panelAuthoringNotes.filter(({ panelId }) => isKept(panelId)),
    editedPanelIds: new Set([...context.editedPanelIds].filter(isKept)),
  };
};
