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
import { discardInvalidChanges, type ValidateDashboard } from './validate_dashboard';
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
  finalizeDashboard?: FinalizeDashboard;
  validateDashboard?: ValidateDashboard;
}

/** Completes the dashboard after all operations ran and before it is validated. */
export type FinalizeDashboard = (
  dashboardData: DashboardAttachmentData
) => Promise<DashboardAttachmentData>;

/**
 * Environment-agnostic dashboard generation: turns a prior dashboard payload (or
 * an empty one) plus an ordered list of operations into a new payload. Identity,
 * persistence, and result shape belong to the calling tool. Inline panel content
 * is resolved via the injected `resolvePanelContent` callback, so the core never
 * reads any store. Control fields are validated against index mappings when
 * the host provides `resolveControlFieldCapabilities`. The host can complete the
 * result with `finalizeDashboard` (e.g. a default time range) before it is
 * validated. When the host provides `validateDashboard`, changes that make the dashboard invalid are discarded and
 * reported as failures.
 */
export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolvePanelContent,
  resolveAttachmentPanel,
  resolveControlFieldCapabilities,
  finalizeDashboard,
  validateDashboard,
}: ExecuteDashboardOperationsParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
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

  if (finalizeDashboard) {
    nextDashboardData = await finalizeDashboard(nextDashboardData);
  }

  if (!validateDashboard) {
    return { dashboardData: nextDashboardData, failures, panelAuthoringNotes };
  }

  const validationResult = discardInvalidChanges({
    originalDashboardData,
    dashboardData: nextDashboardData,
    validateDashboard,
  });

  return {
    dashboardData: validationResult.dashboardData,
    failures: [...failures, ...validationResult.failures],
    panelAuthoringNotes: panelAuthoringNotes.filter(
      ({ panelId }) => !validationResult.discardedPanelIds.has(panelId)
    ),
  };
};
