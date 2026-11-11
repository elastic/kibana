/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  getLeafPanels,
  getPanelContainers,
  getPanelQueries,
  getPanelQueryKey,
  getSectionTitles,
} from '../dashboard_panels';
import type { DashboardAgentEvaluator } from '../types';
import { skippedResult } from '../evaluator_utils';
import { getLastWrittenDashboardId } from '../extract_dashboard';
import { findModeQuestionFailures } from './enhance_evaluators';

export const ENHANCE_SCOPE_EVALUATOR_NAME = 'Enhance Scope';

const getDashboardSettings = ({
  title,
  description,
  time_range: timeRange,
  pinned_panels: pinnedPanels,
  filters,
}: DashboardAttachmentData) => ({ title, description, timeRange, pinnedPanels, filters });

const getPanelPlacements = (dashboard: DashboardAttachmentData) =>
  new Map(
    getPanelContainers(dashboard).flatMap(({ sectionTitle, panels }) =>
      panels.map(({ id, grid }) => [id, { sectionTitle, grid }] as const)
    )
  );

/**
 * An answer to the mode question that names specific charts must change those
 * charts and nothing else: the question asked first, every other panel, the
 * layout, the dashboard text, controls, filters and time range exactly as
 * seeded, and each named chart edited with its queries kept. Any change outside
 * the request scores 0.
 */
export const enhanceScopeEvaluator: DashboardAgentEvaluator = {
  name: ENHANCE_SCOPE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const scope = expected?.scopedEnhance;
    if (!scope) {
      return skippedResult('Not a scoped enhance example.');
    }
    const { before, dashboard } = output;
    if (!before || !dashboard) {
      return {
        score: null,
        label: 'missing-dashboard',
        explanation: 'Could not read the dashboard.',
      };
    }
    if (getLastWrittenDashboardId(output.steps ?? []) === undefined) {
      return { score: 0, label: 'no-write', explanation: 'The agent never edited the dashboard.' };
    }

    const targets = new Set(scope.panelIds);
    const panelsBefore = new Map(getLeafPanels(before).map((panel) => [panel.id, panel]));
    const panelsAfter = new Map(getLeafPanels(dashboard).map((panel) => [panel.id, panel]));

    const changedOutsideScope = [...panelsBefore.keys()].filter(
      (id) => !targets.has(id) && !isEqual(panelsBefore.get(id), panelsAfter.get(id))
    );
    const addedPanels = [...panelsAfter.keys()].filter((id) => !panelsBefore.has(id));
    const deletedTargets = scope.panelIds.filter((id) => !panelsAfter.has(id));
    const untouchedTargets = scope.panelIds.filter(
      (id) =>
        panelsAfter.has(id) && isEqual(panelsBefore.get(id)?.config, panelsAfter.get(id)?.config)
    );
    const placementsBefore = getPanelPlacements(before);
    const placementsAfter = getPanelPlacements(dashboard);
    const movedTargets = scope.panelIds.filter(
      (id) => panelsAfter.has(id) && !isEqual(placementsBefore.get(id), placementsAfter.get(id))
    );
    const requeriedTargets = scope.panelIds.filter((id) => {
      const panelBefore = panelsBefore.get(id);
      const panelAfter = panelsAfter.get(id);
      return (
        panelBefore !== undefined &&
        panelAfter !== undefined &&
        getPanelQueryKey(getPanelQueries(panelBefore)) !==
          getPanelQueryKey(getPanelQueries(panelAfter))
      );
    });
    const failures = [
      ...findModeQuestionFailures(output).failures,
      changedOutsideScope.length > 0 &&
        `changed panels outside the request: ${changedOutsideScope.join(', ')}`,
      addedPanels.length > 0 && `added panels: ${addedPanels.join(', ')}`,
      deletedTargets.length > 0 && `deleted the requested panels: ${deletedTargets.join(', ')}`,
      movedTargets.length > 0 &&
        `moved or resized the requested panels: ${movedTargets.join(', ')}`,
      requeriedTargets.length > 0 &&
        `changed the queries of the requested panels: ${requeriedTargets.join(', ')}`,
      !isEqual(getSectionTitles(before), getSectionTitles(dashboard)) && 'changed the sections',
      !isEqual(getDashboardSettings(before), getDashboardSettings(dashboard)) &&
        'changed the dashboard title, description, controls, filters, or time range',
      untouchedTargets.length > 0 &&
        `did not edit the requested panels: ${untouchedTargets.join(', ')}`,
    ].filter((failure): failure is string => typeof failure === 'string');

    return {
      score: failures.length === 0 ? 1 : 0,
      label: failures.length === 0 ? 'scoped' : 'out-of-scope',
      explanation:
        failures.length === 0 ? `Only ${scope.panelIds.join(', ')} changed.` : failures.join('; '),
      metadata: { targets: scope.panelIds, changedOutsideScope, addedPanels, failures },
    };
  },
};
