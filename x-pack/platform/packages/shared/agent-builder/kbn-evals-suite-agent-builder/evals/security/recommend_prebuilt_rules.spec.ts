/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';

/**
 * Deterministic precision eval for the `recommend-prebuilt-rules` skill:
 * when the user asks for rules covering a MITRE tactic, every rule the skill
 * surfaces from the installable catalog must actually cover that tactic.
 *
 * This is a programmatic check (raw `converse` + `expect`), not an LLM-judge
 * dataset example — the claim is structural and reads straight off the
 * `security.find_prebuilt_rules` tool call (its `params` and `results`).
 *
 * Requirements for the eval target Kibana:
 * - Start with the `dexAiSkillOnboardPrebuiltRules` experimental flag enabled
 *   (`xpack.securitySolution.enableExperimental`), otherwise the skill is never
 *   registered and the agent cannot route to it.
 * - The bundled `security_detection_engine` package is installed in `beforeAll`
 *   to populate the installable catalog (see below).
 */

// Tactic under test. The ID is stable across MITRE and rule-package versions, so
// we assert on it rather than rule names/counts. Defense Evasion (TA0005) is one
// of the largest tactics in the bundled catalog, so a tactic query reliably
// returns many installable rules.
const TACTIC_ID = 'TA0005';
const TACTIC_NAME = 'Defense Evasion';

const FIND_PREBUILT_RULES_TOOL_ID = 'security.find_prebuilt_rules';
const GET_CATALOG_OVERVIEW_TOOL_ID = 'security.get_installable_catalog_overview';

// Floor that guards against a vacuous pass: "every returned rule covers the
// tactic" is trivially true on an empty result, so a missing/empty catalog would
// otherwise look green. A real bundled catalog has far more than this for TA0005.
const MIN_EXPECTED_RULES = 3;

// Install the real bundled `security_detection_engine` package via the Fleet EPM
// API. It is bundled with Kibana, so this works offline. Installing the *package*
// only creates `security-rule` *asset* saved objects (the installable catalog) —
// it does not install/enable detection rules — so `find_prebuilt_rules`, which
// only sees not-yet-installed rules, returns the full real catalog. We
// intentionally do not uninstall it in teardown: it is a shared asset other
// security evals also rely on, and leaving it installed is harmless.
const FLEET_BULK_INSTALL_PATH = '/api/fleet/epm/packages/_bulk';

interface ToolCallStep {
  type?: string;
  tool_id?: string;
  params?: { filter?: { mitreTactic?: unknown; tags?: unknown } };
  results?: unknown[];
}

interface TacticRule {
  name?: string;
  threat?: Array<{ tactic?: { id?: string; name?: string } }>;
}

const getFindPrebuiltRulesCalls = (steps: ToolCallStep[]): ToolCallStep[] =>
  steps.filter(
    (step) => step?.type === 'tool_call' && step.tool_id === FIND_PREBUILT_RULES_TOOL_ID
  );

// Did this search route the tactic through the structured `mitreTactic` filter
// (the documented path), rather than falling back to keywords/tags?
const routedToTactic = (step: ToolCallStep): boolean => {
  const mitreTactic = step?.params?.filter?.mitreTactic;
  if (!Array.isArray(mitreTactic)) return false;
  return mitreTactic.some(
    (value) => value === TACTIC_ID || String(value).toLowerCase() === TACTIC_NAME.toLowerCase()
  );
};

// The tool result is `[{ type, data: { total, rules } }]`. Pull the rules array
// out without assuming more about the wrapper than `data.rules`.
const rulesFromStep = (step: ToolCallStep): TacticRule[] => {
  const results = Array.isArray(step?.results) ? step.results : [];
  for (const result of results) {
    const rules = (result as { data?: { rules?: unknown } })?.data?.rules;
    if (Array.isArray(rules)) return rules as TacticRule[];
  }
  return [];
};

// A rule covers the tactic if any of its MITRE threat entries names it. Rules are
// multi-tactic, so this is "includes the tactic", not "sole tactic". Works on both
// the triage shape (`threat: [{ tactic: { id, name } }]`) and the full threat shape.
const coversTactic = (rule: TacticRule): boolean =>
  Array.isArray(rule?.threat) &&
  rule.threat.some(
    (entry) => entry?.tactic?.id === TACTIC_ID || entry?.tactic?.name === TACTIC_NAME
  );

const getCatalogOverviewCalls = (steps: ToolCallStep[]): ToolCallStep[] =>
  steps.filter(
    (step) => step?.type === 'tool_call' && step.tool_id === GET_CATALOG_OVERVIEW_TOOL_ID
  );

// The overview result is `[{ type, data: { total_installable_count, tags: [{ value, count }] } }]`.
// Its tag values are the only legitimate source the skill may draw `tags` filters from.
const catalogTagsFromStep = (step: ToolCallStep): string[] => {
  const results = Array.isArray(step?.results) ? step.results : [];
  for (const result of results) {
    const tagBuckets = (result as { data?: { tags?: unknown } })?.data?.tags;
    if (Array.isArray(tagBuckets)) {
      return tagBuckets
        .map((tag) => (tag as { value?: unknown })?.value)
        .filter((value): value is string => typeof value === 'string');
    }
  }
  return [];
};

// Tag values the agent passed to a `find_prebuilt_rules` `tags` filter.
const tagsFromFilter = (step: ToolCallStep): string[] => {
  const filterTags = step?.params?.filter?.tags;
  return Array.isArray(filterTags)
    ? filterTags.filter((tag): tag is string => typeof tag === 'string')
    : [];
};

evaluate.describe(
  'Security Skills - Recommend Prebuilt Rules',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate.beforeAll(async ({ kbnClient, log }) => {
      log.info(
        '[recommend-prebuilt-rules eval] Installing bundled security_detection_engine package...'
      );
      await kbnClient.request({
        path: FLEET_BULK_INSTALL_PATH,
        method: 'POST',
        query: { prerelease: true },
        headers: { 'elastic-api-version': '2023-10-31' },
        body: { packages: ['security_detection_engine'], force: false },
      });
      log.info('[recommend-prebuilt-rules eval] Package install complete');
    });

    evaluate(
      'if user asks for rules covering a certain tactic, only rules that cover that tactic are returned',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          messages: [
            {
              message: `Which rules can I install to cover the ${TACTIC_NAME} tactic?`,
            },
          ],
        });

        expect(response.errors).toEqual([]);

        const steps = (response.steps ?? []) as ToolCallStep[];
        const findCalls = getFindPrebuiltRulesCalls(steps);

        // The skill must search the installable catalog at least once.
        expect(findCalls.length).toBeGreaterThan(0);

        // Routing: at least one search routed the tactic through `mitreTactic`.
        const tacticCalls = findCalls.filter(routedToTactic);
        expect(tacticCalls.length).toBeGreaterThan(0);

        // Precision: collect every rule returned by the tactic-filtered calls.
        const returnedRules = tacticCalls.flatMap(rulesFromStep);

        // Guard against a vacuous pass on an empty catalog.
        expect(returnedRules.length).toBeGreaterThanOrEqual(MIN_EXPECTED_RULES);

        // Every returned rule must cover the requested tactic. Mapping to names
        // gives a readable failure (the off-tactic rules) instead of a bare count.
        const offTactic = returnedRules
          .filter((rule) => !coversTactic(rule))
          .map((rule) => rule?.name ?? '<unknown>');
        expect(offTactic).toEqual([]);
      }
    );

    evaluate(
      'tag filters use only tag values from the catalog overview (no hallucinated tags)',
      async ({ chatClient }) => {
        // "Windows" maps to the `OS: Windows` tag (no tactic/severity equivalent), so per the
        // skill's worked examples this exercises the overview-then-tags path.
        const response = await chatClient.converse({
          messages: [{ message: 'What Windows detection rules can I install?' }],
        });

        expect(response.errors).toEqual([]);

        const steps = (response.steps ?? []) as ToolCallStep[];

        // The skill must consult the catalog overview before any tags-filtered search.
        const overviewCalls = getCatalogOverviewCalls(steps);
        expect(overviewCalls.length).toBeGreaterThan(0);

        // The only legitimate source of tag values: the overview result from this turn.
        const catalogTags = new Set(overviewCalls.flatMap(catalogTagsFromStep));
        expect(catalogTags.size).toBeGreaterThan(0);

        // Tags the agent actually passed to find_prebuilt_rules.
        const usedTags = getFindPrebuiltRulesCalls(steps).flatMap(tagsFromFilter);

        // Guard against a vacuous pass: the query must have exercised the tags path.
        expect(usedTags.length).toBeGreaterThan(0);

        // Anti-hallucination: every tag used must come from the overview result.
        const ungroundedTags = usedTags.filter((tag) => !catalogTags.has(tag));
        expect(ungroundedTags).toEqual([]);
      }
    );
  }
);
