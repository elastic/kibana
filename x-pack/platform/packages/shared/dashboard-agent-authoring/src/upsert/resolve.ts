/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { resolveControls, type IdentifiedControl, type PlannedControl } from '../controls';
import type { PanelContentSource, ResolvePanelContent } from '../panels';
import type { PanelContent, PanelContentAttempt } from '../resolve_panel';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from '../types';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import type { DashboardFailure } from '../utils';
import type { PanelChange, PlannedPanel } from './plan';

interface PanelResolvers {
  resolvePanelContent: ResolvePanelContent;
  resolveAttachmentPanel: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
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
  { resolvePanelContent, resolveAttachmentPanel }: PanelResolvers
): PanelContentAttempt | Promise<PanelContentAttempt> => {
  switch (content.source) {
    case 'config':
      return { type: 'success', panelContent: content.panelContent };
    case 'attachment':
      return resolveAttachmentPanel(content.attachmentId);
    case 'request':
      return resolvePanelContent(content.request);
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
  removedControlIds,
  takenIds,
  projectRouting,
  resolvers,
  logger,
}: {
  panels: PlannedPanel[];
  controls: PlannedControl[];
  /** The controls of the original dashboard. */
  existingControls: NonNullable<DashboardAttachmentData['pinned_panels']>;
  removedControlIds: ReadonlySet<string>;
  /** Ids of the panels, sections, and controls the dashboard has or the call names. */
  takenIds: Iterable<string>;
  projectRouting?: string;
  resolvers: PanelResolvers;
  logger: Logger;
}): Promise<ResolvedChanges> => {
  const [attempts, resolvedControls] = await Promise.all([
    Promise.all(panels.map(({ content }) => content && resolveContent(content, resolvers))),
    resolveControls({
      controls,
      existingControls,
      removedIds: removedControlIds,
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
