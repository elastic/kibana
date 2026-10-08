/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { EvaluationResult } from '@kbn/evals';
import { getLeafPanels, getPanelQueries, normalizeQuery } from '../dashboard_panels';
import type { DashboardAgentEvaluator, DashboardAgentTaskOutput, EnhanceGold } from '../types';
import { skippedResult } from '../evaluator_utils';
import {
  GENERATE_DASHBOARD_TOOL_ID,
  findAskUserQuestionPrompt,
  findModeOptionIndex,
  getLastWrittenDashboardId,
} from '../extract_dashboard';
import {
  SCORED_RULES,
  findViolations,
  getRuleTarget,
  type DashboardRuleId,
  type DashboardRuleViolation,
} from './dashboard_rules';
import { findPanelRemovals, type PanelRemovals } from './panel_removal';
import {
  findRemainingSeedDefects,
  isSeedDefect,
  seedDefectAppliesTo,
  type SeedDefectId,
} from './seed_defects';

export const ENHANCE_MODE_QUESTION_EVALUATOR_NAME = 'Enhance Mode Question';
export const ENHANCE_MODE_COMPLIANCE_EVALUATOR_NAME = 'Enhance Mode Compliance';
export const ENHANCE_DEFECT_RESOLUTION_EVALUATOR_NAME = 'Enhance Defect Resolution';
export const ENHANCE_NO_REGRESSION_EVALUATOR_NAME = 'Enhance No Regression';

/**
 * A bare "enhance" request must end the opening turn with one question that
 * offers both modes, before anything is written. A request that already names
 * the mode must not ask.
 */
export const enhanceModeQuestionEvaluator: DashboardAgentEvaluator = {
  name: ENHANCE_MODE_QUESTION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const enhance = expected?.enhance;
    if (!enhance) {
      return skippedResult('Not an enhance example.');
    }
    const prompt = findAskUserQuestionPrompt(output.openingPrompts ?? []);

    if (!enhance.asksMode) {
      return prompt
        ? {
            score: 0,
            label: 'asked-needlessly',
            explanation: 'The request named the mode, but the agent asked for it anyway.',
            metadata: { prompt },
          }
        : { score: 1, label: 'did-not-ask', explanation: 'The agent applied the stated mode.' };
    }

    if (!prompt) {
      return {
        score: 0,
        label: 'did-not-ask',
        explanation: 'A bare enhance request should ask which mode to apply.',
      };
    }
    const options = prompt.questions[0]?.options ?? [];
    const offersBothModes = (['appearance', 'content'] as const).every(
      (mode) => findModeOptionIndex(options, mode) !== -1
    );
    const wroteBeforeAsking = (output.openingToolIds ?? []).includes(GENERATE_DASHBOARD_TOOL_ID);
    const failures = [
      prompt.questions.length !== 1 && `asked ${prompt.questions.length} questions, expected 1`,
      !offersBothModes &&
        `options [${options.map(({ label }) => label).join(', ')}] do not offer both modes`,
      wroteBeforeAsking && 'changed the dashboard before asking',
    ].filter((failure): failure is string => typeof failure === 'string');

    return {
      score: failures.length === 0 ? 1 : 0,
      label: failures.length === 0 ? 'asked' : 'asked-badly',
      explanation:
        failures.length === 0
          ? 'The agent asked one question offering both modes before changing the dashboard.'
          : failures.join('; '),
      metadata: { prompt, failures },
    };
  },
};

const missingDashboardResult = (before?: DashboardAttachmentData): EvaluationResult => ({
  score: null,
  label: 'missing-dashboard',
  explanation: `Could not read the ${before ? 'enhanced' : 'seeded'} dashboard.`,
});

/**
 * When the agent never wrote the dashboard, the result is the seed itself,
 * so "nothing changed that should not" holds trivially. Abstain rather than
 * reward a run that did no enhancing; Defect Resolution scores that run 0.
 */
const noWriteResult = (output: DashboardAgentTaskOutput): EvaluationResult | undefined =>
  getLastWrittenDashboardId(output.steps ?? []) === undefined
    ? {
        score: null,
        label: 'no-write',
        explanation: 'The agent never wrote the dashboard, so there is no enhance to check.',
      }
    : undefined;

const getPanelIds = (dashboard: DashboardAttachmentData): Set<string> =>
  new Set(getLeafPanels(dashboard).map(({ id }) => id));

const queriesById = (dashboard: DashboardAttachmentData): Map<string, string[]> =>
  new Map(
    getLeafPanels(dashboard).map((panel) => [panel.id, getPanelQueries(panel).map(normalizeQuery)])
  );

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** Invariants each mode must keep, as `[name, held]` pairs. */
const checkInvariants = (
  { mode }: EnhanceGold,
  before: DashboardAttachmentData,
  after: DashboardAttachmentData,
  { disallowed }: PanelRemovals
): Array<[string, boolean]> => {
  const timeRangeKept =
    before.time_range?.from === after.time_range?.from &&
    before.time_range?.to === after.time_range?.to;
  if (mode === 'content') {
    // Content mode may drop markdown and one copy of a duplicate, and nothing
    // else: deleting a chart must not count as fixing it, and adding a new one
    // does not make up for it.
    return [
      ['removed panels', disallowed.length === 0],
      ['time range', timeRangeKept],
    ];
  }

  // Appearance mode may drop markdown, but no other panel, and adds none.
  const beforeIds = getPanelIds(before);
  const addedPanel = [...getPanelIds(after)].some((id) => !beforeIds.has(id));
  const afterQueries = queriesById(after);
  return [
    ['panel ids', disallowed.length === 0 && !addedPanel],
    [
      'panel queries',
      [...queriesById(before)].every(
        ([id, queries]) => !afterQueries.has(id) || sameList(queries, afterQueries.get(id) ?? [])
      ),
    ],
    ['controls', isEqual(before.pinned_panels ?? [], after.pinned_panels ?? [])],
    ['filters', isEqual(before.filters ?? [], after.filters ?? [])],
    ['time range', timeRangeKept],
  ];
};

/**
 * Appearance mode keeps every panel id except markdown, every kept panel's
 * ES|QL, the controls and filters as they were, and the time range; content
 * mode keeps the time range and every panel except markdown and one copy of a
 * duplicate. Any broken invariant scores 0: changing the data a user did not
 * ask to change is a data-integrity failure, not a partial success.
 */
export const enhanceModeComplianceEvaluator: DashboardAgentEvaluator = {
  name: ENHANCE_MODE_COMPLIANCE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const enhance = expected?.enhance;
    if (!enhance) {
      return skippedResult('Not an enhance example.');
    }
    const { before, dashboard } = output;
    if (!before || !dashboard) {
      return missingDashboardResult(before);
    }
    const noWrite = noWriteResult(output);
    if (noWrite) {
      return noWrite;
    }

    const removals = findPanelRemovals(before, dashboard, enhance.mode);
    const broken = checkInvariants(enhance, before, dashboard, removals)
      .filter(([, held]) => !held)
      .map(([name]) => name);

    return {
      score: broken.length === 0 ? 1 : 0,
      label: broken.length === 0 ? 'compliant' : 'violated',
      explanation:
        broken.length === 0
          ? `${enhance.mode} mode invariants held.`
          : `${enhance.mode} mode changed: ${broken.join(', ')}.`,
      metadata: { mode: enhance.mode, broken, removals },
    };
  },
};

/**
 * The seeded dashboard declares its defects as rule ids, plus seed defects
 * judged against the seed (markdown kept with its seeded text); the score is
 * the fraction of the defects this mode may fix that the result no longer shows.
 * A defect on a panel the agent deleted without being allowed to stays open.
 * A declared defect the seeded dashboard does not actually show is a dataset
 * bug, so the evaluator abstains instead of rewarding the agent for it.
 */
export const enhanceDefectResolutionEvaluator: DashboardAgentEvaluator = {
  name: ENHANCE_DEFECT_RESOLUTION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const enhance = expected?.enhance;
    const defects = enhance?.defects ?? [];
    if (!enhance || defects.length === 0) {
      return skippedResult('No declared defects.');
    }
    const { before, dashboard } = output;
    if (!before || !dashboard) {
      return missingDashboardResult(before);
    }

    const ruleDefects = defects.filter(
      (defect): defect is DashboardRuleId => !isSeedDefect(defect)
    );
    const seedDefects = defects.filter(isSeedDefect);
    const absentFromSeed = [
      ...ruleDefects.filter((rule) => findViolations(before, [rule]).length === 0),
      ...seedDefects.filter((defect: SeedDefectId) => !seedDefectAppliesTo(defect, before)),
    ];
    if (absentFromSeed.length > 0) {
      return {
        score: null,
        label: 'fixture-mismatch',
        explanation: `The seeded dashboard does not show declared defects: ${absentFromSeed.join(
          ', '
        )}.`,
      };
    }

    // A panel the agent deleted without the rules allowing it keeps its seeded
    // defects: deleting a chart is not fixing it.
    const deleted = new Set(findPanelRemovals(before, dashboard, enhance.mode).disallowed);
    const seedViolations = [
      ...findViolations(before, ruleDefects),
      ...findRemainingSeedDefects(seedDefects, before, before),
    ];
    const deletedInsteadOfFixed = seedViolations.flatMap((violation) => {
      const panelIds = violation.panelIds.filter((id) => deleted.has(id));
      return panelIds.length === 0
        ? []
        : [{ ...violation, panelIds, detail: `${panelIds.join(', ')} deleted instead of fixed` }];
    });
    const remaining = [
      ...findViolations(dashboard, ruleDefects),
      ...findRemainingSeedDefects(seedDefects, before, dashboard),
      ...deletedInsteadOfFixed,
    ];
    const unresolved = defects.filter((rule) =>
      remaining.some((violation) => violation.rule === rule)
    );

    return {
      score: 1 - unresolved.length / defects.length,
      label: unresolved.length === 0 ? 'resolved' : 'unresolved',
      explanation:
        unresolved.length === 0
          ? `All ${defects.length} declared defects were fixed.`
          : `Still present: ${remaining
              .map(({ rule, detail }) => `${rule} (${detail})`)
              .join('; ')}.`,
      metadata: { defects, unresolved, remaining },
    };
  },
};

/**
 * One key per rule and flagged panel, or per rule for dashboard-level
 * violations, so a container rule that flags fewer panels than the seed did
 * (for example one metric still after the charts, instead of four) is an
 * improvement, not a new violation.
 */
const violationKeys = ({ rule, panelIds }: DashboardRuleViolation): string[] =>
  panelIds.length === 0 ? [rule] : panelIds.map((id) => `${rule}:${id}`);

/**
 * Enhancing must not break a rule the seeded dashboard already met, for
 * example by giving a metric a panel title or a chart a legacy palette. Every
 * rule and panel pair flagged now but not on the seed counts. Score is the
 * fraction of panels (plus one unit per dashboard-level rule) with no new
 * violation.
 */
export const enhanceNoRegressionEvaluator: DashboardAgentEvaluator = {
  name: ENHANCE_NO_REGRESSION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    if (!expected?.enhance) {
      return skippedResult('Not an enhance example.');
    }
    const { before, dashboard } = output;
    if (!before || !dashboard) {
      return missingDashboardResult(before);
    }
    const noWrite = noWriteResult(output);
    if (noWrite) {
      return noWrite;
    }

    const seeded = new Set(findViolations(before, SCORED_RULES).flatMap(violationKeys));
    const introduced = findViolations(dashboard, SCORED_RULES).flatMap((violation) => {
      if (violation.panelIds.length === 0) {
        return seeded.has(violation.rule) ? [] : [violation];
      }
      const newPanelIds = violation.panelIds.filter((id) => !seeded.has(`${violation.rule}:${id}`));
      return newPanelIds.length === 0 ? [] : [{ ...violation, panelIds: newPanelIds }];
    });
    const flaggedPanels = new Set(introduced.flatMap(({ panelIds }) => panelIds));
    const brokenDashboardRules = new Set(
      introduced.filter(({ panelIds }) => panelIds.length === 0).map(({ rule }) => rule)
    );
    const units =
      getLeafPanels(dashboard).length +
      SCORED_RULES.filter((rule) => getRuleTarget(rule) === 'dashboard').length;

    return {
      score: 1 - (flaggedPanels.size + brokenDashboardRules.size) / units,
      label: introduced.length === 0 ? 'no-regression' : 'regressed',
      explanation:
        introduced.length === 0
          ? 'The enhanced dashboard breaks no rule the seed met.'
          : `Introduced: ${introduced
              .map(({ rule, detail }) => `${rule} (${detail})`)
              .join('; ')}.`,
      metadata: { introduced },
    };
  },
};
