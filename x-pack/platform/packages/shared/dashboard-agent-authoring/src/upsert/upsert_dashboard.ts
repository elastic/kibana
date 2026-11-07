/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { reportUnderPlannedIdentifiers } from '../controls';
import { indexDashboard } from '../dashboard_state';
import type { ResolvePanelContent } from '../panels';
import type {
  ResolveAttachmentPanel,
  ResolveControlFieldCapabilities,
  ResolveEsqlControlColumnType,
} from '../types';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { DashboardFailure } from '../utils';
import { discardInvalidChanges, type DashboardValidator } from '../validate_dashboard';
import { applyPlan } from './apply';
import { getChangedIds, type ChangedIds } from './changed_ids';
import { planUpsert } from './plan';
import { predictPlannedDashboard } from './predict';
import { resolvePlan } from './resolve';
import type { DashboardUpsert } from './schema';

interface ExecuteDashboardUpsertParams {
  dashboardData?: DashboardAttachmentData;
  upsert: DashboardUpsert;
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  resolveEsqlControlColumnType?: ResolveEsqlControlColumnType;
  validator?: DashboardValidator;
  /**
   * Called before panel content resolves with the dashboard the plan predicts, so the host can lay
   * it out in parallel. Not called when a panel's kind or size is known only after resolution.
   */
  onPlanned?: (predictedDashboardData: DashboardAttachmentData) => void;
  /**
   * Called before panel content resolves with the panels the plan adds, whether or not their layout
   * can be predicted, so the host can show them as they build.
   */
  onNewPanelsPlanned?: (newPanels: PlannedNewPanel[], title: string) => void;
  /** Called as soon as each planned panel's content resolves, before the other panels finish. */
  onPanelResolved?: (panelId: string, attempt: PanelContentAttempt) => void;
}

export interface PlannedNewPanel {
  id: string;
  /** What the panel is about, when the plan says. */
  label?: string;
  chartType?: string;
}

export interface DashboardUpsertResult extends ChangedIds {
  dashboardData: DashboardAttachmentData;
  failures: DashboardFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
}

const missingResolver = (message: string) => (): never => {
  throw new Error(message);
};

/**
 * Environment-agnostic dashboard upsert: applies the desired dashboard fields, sections, panels,
 * controls, and removals to a prior dashboard payload (or an empty one), keyed by id. New panels and
 * sections keep the ids the caller chose. Panel content is resolved in parallel through the
 * injected resolvers. New and moved panels get placeholder grids below their container, for the
 * layout step to place. Changes that make the dashboard invalid are discarded when the host
 * provides a `validator`.
 */
export const executeDashboardUpsert = async ({
  dashboardData,
  upsert,
  logger,
  resolvePanelContent = missingResolver(
    'Inline panel resolver is required for request-source panels.'
  ),
  resolveAttachmentPanel = missingResolver(
    'Attachment panel resolver is required for attachment-source panels.'
  ),
  resolveControlFieldCapabilities,
  resolveEsqlControlColumnType,
  validator,
  onPlanned,
  onNewPanelsPlanned,
  onPanelResolved,
}: ExecuteDashboardUpsertParams): Promise<DashboardUpsertResult> => {
  const originalDashboardData = structuredClone(
    dashboardData ?? { title: 'User Dashboard', description: undefined, panels: [] }
  );
  const original = indexDashboard(originalDashboardData);
  const plan = planUpsert({ original, upsert });
  if (onNewPanelsPlanned) {
    const newPanels = plan.panels.flatMap((panel): PlannedNewPanel[] => {
      if (panel.existingPanel) return [];
      const request = panel.content.source === 'request' ? panel.content.request : undefined;
      return [
        {
          id: panel.id,
          label: request && 'nlQuery' in request ? request.nlQuery : undefined,
          chartType: request && 'chartType' in request ? request.chartType : undefined,
        },
      ];
    });
    onNewPanelsPlanned(newPanels, plan.metadata.title ?? originalDashboardData.title);
  }
  if (onPlanned) {
    const predictedDashboardData = predictPlannedDashboard(originalDashboardData, plan);
    if (predictedDashboardData) {
      onPlanned(predictedDashboardData);
    }
  }
  const { panels, controls, failures } = await resolvePlan({
    panels: plan.panels,
    controls: plan.controls,
    existingControls: originalDashboardData.pinned_panels ?? [],
    existingPanels: originalDashboardData.panels,
    timeRange: plan.metadata.time_range ?? originalDashboardData.time_range,
    removals: plan.removals,
    takenIds: plan.reservedIds,
    projectRouting: originalDashboardData.project_routing,
    resolvers: {
      resolvePanelContent,
      resolveAttachmentPanel,
      resolveControlFieldCapabilities,
      resolveEsqlControlColumnType,
    },
    logger,
    onPanelResolved,
  });
  const nextDashboardData = applyPlan({
    dashboardData: originalDashboardData,
    changes: { ...plan, panels, controls },
  });

  const validationResult = validator
    ? discardInvalidChanges({
        originalDashboardData,
        dashboardData: nextDashboardData,
        validator,
      })
    : { dashboardData: nextDashboardData, failures: [], discardedPanelIds: new Set<string>() };

  return {
    dashboardData: validationResult.dashboardData,
    ...getChangedIds({ original, dashboardData: validationResult.dashboardData }),
    failures: [
      ...plan.failures,
      ...failures,
      ...reportUnderPlannedIdentifiers(validationResult.failures, controls),
    ],
    panelAuthoringNotes: panels.flatMap(({ id, authoringNote }): PanelAuthoringNote[] =>
      authoringNote && !validationResult.discardedPanelIds.has(id)
        ? [{ panelId: id, authoringNote }]
        : []
    ),
  };
};
