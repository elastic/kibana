/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels, getPanelKind } from '../dashboard_panels';

export interface RuleViolation<TRuleId extends string = string> {
  rule: TRuleId;
  panelIds: string[];
  detail: string;
  /** JSON path inside the panel config, when the rule points at one field. */
  path?: string;
}

/**
 * `appearance` rules can be fixed without touching panels, queries, or
 * controls; `content` rules need panels removed or controls added, which only
 * content mode may do.
 */
export type RuleScope = 'appearance' | 'content';

/**
 * `must` rules come from "do not / never / always" guidance and are scored;
 * `should` rules come from "prefer / aim / when possible" guidance and are
 * only reported, because they would flag valid layouts.
 */
export type RuleStrictness = 'must' | 'should';

/** Panel kinds a rule inspects: every panel, a list of kinds, or none for dashboard-level rules. */
export type RuleTarget = 'all' | 'dashboard' | readonly string[];

export interface DashboardRule<TRuleId extends string = string> {
  scope: RuleScope;
  strictness: RuleStrictness;
  appliesTo: RuleTarget;
  check: (dashboard: DashboardAttachmentData) => Array<RuleViolation<TRuleId>>;
}

export const targetsPanel = (appliesTo: RuleTarget, panel: AttachmentPanel): boolean =>
  appliesTo === 'all' || (appliesTo !== 'dashboard' && appliesTo.includes(getPanelKind(panel)));

/** Builds a rule that inspects each targeted panel on its own. */
export const panelRule = <TRuleId extends string>(
  rule: TRuleId,
  {
    appliesTo,
    scope = 'appearance',
    strictness = 'must',
    check,
  }: {
    appliesTo: Exclude<RuleTarget, 'dashboard'>;
    scope?: RuleScope;
    strictness?: RuleStrictness;
    check: (panel: AttachmentPanel) => { detail: string; path?: string } | undefined;
  }
): DashboardRule<TRuleId> => ({
  scope,
  strictness,
  appliesTo,
  check: (dashboard) =>
    getLeafPanels(dashboard)
      .filter((panel) => targetsPanel(appliesTo, panel))
      .flatMap((panel) => {
        const found = check(panel);
        return found ? [{ rule, panelIds: [panel.id], ...found }] : [];
      }),
});
