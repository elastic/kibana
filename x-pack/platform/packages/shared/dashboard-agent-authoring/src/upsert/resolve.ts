/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  createEsqlVariablesResolver,
  resolveControls,
  type IdentifiedControl,
  type PlannedControl,
} from '../controls';
import type { PanelContentSource, ResolvePanelContent } from '../panels';
import type { PanelContent, PanelContentAttempt, ResolveEsqlVariables } from '../resolve_panel';
import type {
  ResolveAttachmentPanel,
  ResolveControlFieldCapabilities,
  ResolveEsqlControlColumnType,
} from '../types';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { getSectionIdByPanelId } from '../dashboard_state';
import type { DashboardFailure } from '../utils';
import type { PanelChange, PlannedPanel, PlannedRemovals } from './plan';

interface PanelResolvers {
  resolvePanelContent: ResolvePanelContent;
  resolveAttachmentPanel: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  resolveEsqlControlColumnType?: ResolveEsqlControlColumnType;
}

export type ResolvedPanel = PanelChange<PanelContent> & { authoringNote?: string };

/** The planned panels and controls that can be applied, and a failure for each one that cannot. */
export interface ResolvedChanges {
  panels: ResolvedPanel[];
  controls: IdentifiedControl[];
  /** Panel failures, then control failures. */
  failures: DashboardFailure[];
}

const resolveContent = (
  content: PanelContentSource,
  { resolvePanelContent, resolveAttachmentPanel }: PanelResolvers,
  resolveEsqlVariables: ResolveEsqlVariables
): PanelContentAttempt | Promise<PanelContentAttempt> => {
  switch (content.source) {
    case 'config':
      return { type: 'success', panelContent: content.panelContent };
    case 'attachment':
      return resolveAttachmentPanel(content.attachmentId);
    case 'request':
      return resolvePanelContent({ ...content.request, resolveEsqlVariables });
  }
};

/**
 * Resolves the content of every planned panel and the controls in parallel. An existing panel
 * whose content fails to resolve is still moved.
 */
export const resolvePlan = async ({
  panels,
  controls,
  existingControls,
  existingPanels,
  timeRange,
  removals,
  takenIds,
  projectRouting,
  resolvers,
  logger,
}: {
  panels: PlannedPanel[];
  controls: PlannedControl[];
  /** The controls of the original dashboard. */
  existingControls: NonNullable<DashboardAttachmentData['pinned_panels']>;
  /** The panels of the original dashboard, where an unpinned ES|QL control is. */
  existingPanels: DashboardAttachmentData['panels'];
  /** The time range of the dashboard once the call is applied. */
  timeRange?: DashboardAttachmentData['time_range'];
  /** What the call removes: ES|QL controls that are removed publish no variable. */
  removals: PlannedRemovals;
  /** Ids of the panels, sections, and controls the dashboard has or the call names. */
  takenIds: Iterable<string>;
  projectRouting?: string;
  resolvers: PanelResolvers;
  logger: Logger;
}): Promise<ResolvedChanges> => {
  // Where a panel, or a control in the grid, is once the call is applied.
  const sectionIdByPanelId = getSectionIdByPanelId({ panels: existingPanels });
  for (const { id, target } of panels) {
    if (target !== undefined) sectionIdByPanelId.set(id, target);
  }
  const getEsqlVariablesResolver = createEsqlVariablesResolver({
    pinnedPanels: existingControls,
    panels: existingPanels,
    sectionIdByPanelId,
    removedIds: new Set([...removals.controlIds, ...removals.panelIds]),
    timeRange,
    resolveColumnType: resolvers.resolveEsqlControlColumnType,
  });
  const [attempts, resolvedControls] = await Promise.all([
    Promise.all(
      panels.map(({ id, content }) => {
        if (!content) return undefined;
        return resolveContent(
          content,
          resolvers,
          getEsqlVariablesResolver(sectionIdByPanelId.get(id))
        );
      })
    ),
    resolveControls({
      controls,
      existingControls,
      removedIds: removals.controlIds,
      takenIds,
      resolveControlFieldCapabilities: resolvers.resolveControlFieldCapabilities,
      projectRouting,
      logger,
    }),
  ]);

  const panelFailures = panels.flatMap(({ id }, panelIndex): DashboardFailure[] => {
    const attempt = attempts[panelIndex];
    return attempt?.type === 'failure'
      ? [
          {
            type: DASHBOARD_FAILURE_TYPES.upsertDashboard,
            kind: 'panel',
            identifier: id,
            error: attempt.error,
          },
        ]
      : [];
  });
  const resolvedPanels = panels.flatMap((panel, panelIndex): ResolvedPanel[] => {
    const attempt = attempts[panelIndex];
    if (attempt?.type === 'success') {
      const { panelContent, authoringNote } = attempt;
      return [{ ...panel, content: panelContent, authoringNote }];
    }
    return panel.existingPanel ? [{ ...panel, content: undefined }] : [];
  });

  return {
    panels: resolvedPanels,
    controls: resolvedControls.controls,
    failures: [...panelFailures, ...resolvedControls.failures],
  };
};
