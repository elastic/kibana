/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels } from '../dashboard_panels';
import type { DashboardAgentEvaluator } from '../evaluate_dataset';
import { noDashboardResult, skippedResult } from '../evaluator_utils';
import {
  COLOR_FORMAT_RULES,
  COMPOSITION_RULES,
  CONTROL_RULES,
  LAYOUT_RULES,
  STYLING_RULES,
  TITLE_RULES,
  findViolations,
  getRuleStrictness,
  getRuleTarget,
  type DashboardRuleId,
} from './dashboard_rules';
import { targetsPanel } from './rule_model';

export const DASHBOARD_LAYOUT_RULES_EVALUATOR_NAME = 'Dashboard Layout Rules';
export const DASHBOARD_COMPOSITION_ORDER_EVALUATOR_NAME = 'Dashboard Composition Order';
export const DASHBOARD_TITLES_EVALUATOR_NAME = 'Dashboard Titles & Labels';
export const DASHBOARD_CHART_STYLING_EVALUATOR_NAME = 'Dashboard Chart Styling';
export const DASHBOARD_COLOR_FORMAT_EVALUATOR_NAME = 'Dashboard Color & Format';
export const DASHBOARD_CONTROLS_EVALUATOR_NAME = 'Dashboard Controls';

/**
 * Scores the `must` rules in `rules`: one unit per panel some rule targets,
 * plus one per dashboard-level rule, and the score is the fraction of units
 * with no violation. `should` violations are listed as guidance, never scored.
 */
export const createRuleEvaluator = (
  name: string,
  rules: readonly DashboardRuleId[],
  skipReason?: (dashboard: DashboardAttachmentData) => string | undefined
): DashboardAgentEvaluator => {
  const mustRules = rules.filter((rule) => getRuleStrictness(rule) === 'must');
  const shouldRules = rules.filter((rule) => getRuleStrictness(rule) === 'should');
  const dashboardLevelRules = mustRules.filter((rule) => getRuleTarget(rule) === 'dashboard');

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const { dashboard } = output;
      if (!dashboard) {
        return noDashboardResult;
      }
      const panels = getLeafPanels(dashboard);
      if (panels.length === 0) {
        return { score: 0, label: 'no-panels', explanation: 'The dashboard has no panels.' };
      }
      const reason = skipReason?.(dashboard);
      if (reason) {
        return skippedResult(reason);
      }

      const targetedPanels = panels.filter((panel) =>
        mustRules.some((rule) => targetsPanel(getRuleTarget(rule), panel))
      );
      const units = targetedPanels.length + dashboardLevelRules.length;
      if (units === 0) {
        return skippedResult(`No panel of a kind that [${mustRules.join(', ')}] check.`);
      }

      const violations = findViolations(dashboard, mustRules);
      const guidance = findViolations(dashboard, shouldRules);
      const flaggedPanelIds = new Set(violations.flatMap(({ panelIds }) => panelIds));
      const failedDashboardRules = new Set(
        violations.filter(({ panelIds }) => panelIds.length === 0).map(({ rule }) => rule)
      );
      const failedUnits =
        targetedPanels.filter(({ id }) => flaggedPanelIds.has(id)).length +
        failedDashboardRules.size;

      return {
        score: 1 - failedUnits / units,
        label: violations.length === 0 ? 'pass' : 'violations',
        explanation:
          violations.length === 0
            ? `No violations of [${mustRules.join(', ')}] across ${targetedPanels.length} panels.`
            : violations.map(({ rule, detail }) => `${rule}: ${detail}`).join('; '),
        metadata: { violations, guidance, units, failedUnits },
      };
    },
  };
};

/** Panels inside the 48-column grid, not overlapping, and no full-width KPI; default sizes are guidance. */
export const dashboardLayoutRulesEvaluator = createRuleEvaluator(
  DASHBOARD_LAYOUT_RULES_EVALUATOR_NAME,
  LAYOUT_RULES
);

/**
 * Metric and gauge panels lead every section and the top level. Sections on
 * larger dashboards are guidance.
 */
export const dashboardCompositionOrderEvaluator = createRuleEvaluator(
  DASHBOARD_COMPOSITION_ORDER_EVALUATOR_NAME,
  COMPOSITION_RULES
);

/**
 * A real dashboard title; panel titles by chart type (none on metric and gauge;
 * "measure + breakdown" elsewhere); no xy axis titles.
 */
export const dashboardTitlesEvaluator = createRuleEvaluator(
  DASHBOARD_TITLES_EVALUATOR_NAME,
  TITLE_RULES
);

/**
 * Gradient area fills, xy legends outside at the bottom with a visibility set,
 * pie legends left to Lens, and metrics that color the value, not the background.
 */
export const dashboardChartStylingEvaluator = createRuleEvaluator(
  DASHBOARD_CHART_STYLING_EVALUATOR_NAME,
  STYLING_RULES
);

/**
 * Kibana palettes only (no legacy ones), no static color overrides on
 * default-palette charts, and no percent format on a column the query already
 * scales to 0–100. Gauge bands other than the default four are guidance.
 */
export const dashboardColorFormatEvaluator = createRuleEvaluator(
  DASHBOARD_COLOR_FORMAT_EVALUATOR_NAME,
  COLOR_FORMAT_RULES
);

/**
 * At most 5 filter controls and one time slider, none on id-like fields.
 * Skipped when the dashboard has no controls: whether it should have any is
 * a content-mode defect, scored by Defect Resolution.
 */
export const dashboardControlsEvaluator = createRuleEvaluator(
  DASHBOARD_CONTROLS_EVALUATOR_NAME,
  CONTROL_RULES,
  ({ pinned_panels: controls = [] }) =>
    controls.length === 0 ? 'The dashboard has no controls.' : undefined
);
