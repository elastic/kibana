/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels, getSectionTitles } from '../dashboard_panels';
import type { DashboardAgentEvaluator } from '../types';
import { skippedResult } from '../evaluator_utils';
import { findAskUserQuestionPrompt, getLastWrittenDashboardId } from '../extract_dashboard';

export const ENHANCE_SCOPE_EVALUATOR_NAME = 'Enhance Scope';

const getDashboardSettings = ({
  title,
  description,
  time_range: timeRange,
  pinned_panels: pinnedPanels,
  filters,
}: DashboardAttachmentData) => ({ title, description, timeRange, pinnedPanels, filters });

/**
 * An answer to the mode question that names specific charts must change those
 * charts and nothing else: the question asked first, every other panel, the section layout, the dashboard
 * text, controls, filters and time range exactly as seeded, and each named
 * chart actually edited. Any change outside the request scores 0.
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
    const askedQuestion = findAskUserQuestionPrompt(output.openingPrompts ?? []) !== undefined;

    const failures = [
      !askedQuestion && 'did not ask which mode to apply',
      changedOutsideScope.length > 0 &&
        `changed panels outside the request: ${changedOutsideScope.join(', ')}`,
      addedPanels.length > 0 && `added panels: ${addedPanels.join(', ')}`,
      deletedTargets.length > 0 && `deleted the requested panels: ${deletedTargets.join(', ')}`,
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
