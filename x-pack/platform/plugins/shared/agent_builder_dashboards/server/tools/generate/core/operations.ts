/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/core/server';
import type { ResolvePanelContent } from './operations/panels';
import type {
  NormalizePanelChange,
  NormalizePanelSkipped,
  ResolveCustomContentTemplate,
} from './operations/types';
import type { PanelFailure } from './utils';
import type { PanelAuthoringNote } from './resolve_panel';
import {
  dashboardOperationSchema,
  executeOperationHandler,
  prepareOperationExecution,
  type DashboardOperation,
} from './operations/registry';
import { compileLayout, deriveRowsFromGrid } from './layout';
import type { LayoutWarning } from './layout';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from './failure_types';

export { dashboardOperationSchema };
export type { DashboardOperation };

interface ExecuteDashboardOperationsParams {
  dashboardData?: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  resolveCustomContentTemplate?: ResolveCustomContentTemplate;
}

/**
 * Environment-agnostic dashboard generation: turns a prior dashboard payload (or
 * an empty one) plus an ordered list of operations into a new payload. Identity,
 * persistence, and result shape belong to the calling tool. Inline panel content
 * is resolved via the injected `resolvePanelContent` callback, so the core never
 * reads any store.
 */
export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolvePanelContent,
  resolveCustomContentTemplate,
}: ExecuteDashboardOperationsParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: PanelFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
  touchedRequestPanelData: boolean;
  panelKeys: Map<string, string>;
  normalizeChanges: NormalizePanelChange[];
  normalizeSkipped: NormalizePanelSkipped[];
  layoutRows: string[][];
  layoutWarnings: LayoutWarning[];
}> => {
  let nextDashboardData = structuredClone(
    dashboardData ?? {
      title: 'User Dashboard',
      description: undefined,
      panels: [],
    }
  );
  const failures: PanelFailure[] = [];
  const panelAuthoringNotes: PanelAuthoringNote[] = [];

  const context = await prepareOperationExecution({
    operations,
    logger,
    resolvePanelContent,
    resolveCustomContentTemplate,
    failures,
    panelAuthoringNotes,
  });

  const setLayoutOps = operations.flatMap((operation, operationIndex) =>
    operation.operation === 'set_layout' ? [{ operation, operationIndex }] : []
  );

  for (const extra of setLayoutOps.slice(0, -1)) {
    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.setLayout,
      identifier: `operations[${extra.operationIndex}]`,
      error: 'At most one set_layout operation is applied. Extra set_layout operations were ignored.',
    });
  }

  for (const [operationIndex, operation] of operations.entries()) {
    if (operation.operation === 'set_layout') {
      continue;
    }
    nextDashboardData = await executeOperationHandler({
      dashboardData: nextDashboardData,
      operation,
      operationIndex,
      context,
    });
  }

  const lastLayout = setLayoutOps.at(-1);
  if (lastLayout) {
    nextDashboardData = await executeOperationHandler({
      dashboardData: nextDashboardData,
      operation: lastLayout.operation,
      operationIndex: lastLayout.operationIndex,
      context,
    });
  } else if (context.unspecifiedGridPanelIds.size > 0) {
    const implicit = compileLayout({
      dashboard: nextDashboardData,
      spec: { implicitPanelIds: [...context.unspecifiedGridPanelIds] },
      panelKeys: context.panelKeys,
    });
    nextDashboardData = implicit.dashboard;
    context.layoutWarnings.push(...implicit.warnings);
    context.layoutRows = implicit.rows;
  }

  if (context.layoutRows.length === 0) {
    context.layoutRows = deriveRowsFromGrid(nextDashboardData).rows;
  }

  return {
    dashboardData: nextDashboardData,
    failures,
    panelAuthoringNotes,
    touchedRequestPanelData: context.touchedRequestPanelData,
    panelKeys: context.panelKeys,
    normalizeChanges: context.normalizeChanges,
    normalizeSkipped: context.normalizeSkipped,
    layoutRows: context.layoutRows,
    layoutWarnings: context.layoutWarnings,
  };
};
