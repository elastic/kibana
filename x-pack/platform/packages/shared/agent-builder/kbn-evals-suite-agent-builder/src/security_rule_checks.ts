/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure scoring helpers for the security rule-skill evals (`detection-coverage`,
 * `find-security-rules`, `recommend-prebuilt-rules`).
 *
 * They live outside the specs so each one can be mutation-tested offline: feed it a
 * deliberately broken answer or tool trace and it must fail. A check that cannot fail is
 * saturated and tells us nothing about a regression.
 */

export interface ToolCallStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

export interface CatalogRule {
  name?: string;
  threat?: Array<{ tactic?: { id?: string; name?: string } }>;
  related_integrations?: Array<{ package?: string }>;
}

export const toolCalls = (steps: ToolCallStep[], toolId: string): ToolCallStep[] =>
  steps.filter((step) => step?.type === 'tool_call' && step.tool_id === toolId);

/** Skill names the agent loaded through `load_skill`. */
export const loadedSkillNames = (steps: ToolCallStep[]): string[] =>
  toolCalls(steps, 'load_skill').map((step) => String(step.params?.skill ?? ''));

/** The assistant's final answer: the last message in the `converse` message list. */
export const finalAnswer = (response: { messages: Array<{ message: string }> }): string =>
  response.messages[response.messages.length - 1]?.message ?? '';

/** Every verdict the detection-coverage skill may return; "exactly one" needs the whole set. */
export const COVERAGE_VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
] as const;

export type CoverageVerdict = (typeof COVERAGE_VERDICTS)[number];

export const verdictsMentioned = (answer: string): CoverageVerdict[] =>
  COVERAGE_VERDICTS.filter((verdict) => answer.includes(verdict));

/** Case-insensitive: the answer may bold or re-case a rule name. */
export const mentionsRule = (answer: string, ruleName: string): boolean =>
  answer.toLowerCase().includes(ruleName.toLowerCase());

const MUTATION_VERBS = '(?:enabled|installed|created|activated|turned on|switched on)';

/**
 * Does the answer claim the assistant itself changed something? The coverage skill has no
 * write tools, so any such claim is a fabrication. Covers first person ("I enabled",
 * "I've installed", "we have created"), passive ("has been enabled") and state-change
 * ("the rule is now active") phrasings; the earlier `/\bI (?:have )?enabled\b/` matched only
 * the first, so every other phrasing passed vacuously. Negations ("I have not enabled") do
 * not match because nothing may sit between the auxiliary and the verb except an adverb.
 */
const MUTATION_CLAIM = new RegExp(
  [
    `\\b(?:I|we)(?:'ve|\\s+have)?\\s+(?:just\\s+|already\\s+|now\\s+)?${MUTATION_VERBS}\\b`,
    `\\b(?:has|have|had)\\s+(?:now\\s+|already\\s+|just\\s+)?been\\s+${MUTATION_VERBS}\\b`,
    `\\b(?:is|are)\\s+now\\s+(?:enabled|installed|active|on|running)\\b`,
  ].join('|'),
  'i'
);

export const claimsMutation = (answer: string): boolean => MUTATION_CLAIM.test(answer);

/** The rule page link an enable route must carry: a redirect tool call or an in-app path. */
export const givesRulePageRoute = (steps: ToolCallStep[], answer: string): boolean =>
  toolCalls(steps, 'security.build_redirect_url').length > 0 ||
  /\/app\/security\/rules\/[\w-]+/.test(answer);

// ---------- recommend-prebuilt-rules ----------

type FilterKey = 'mitreTactic' | 'tags' | 'relatedIntegrations';

/** String values the agent passed to one `find_prebuilt_rules` filter field. */
export const filterValues = (step: ToolCallStep, key: FilterKey): string[] => {
  const values = (step?.params?.filter as Record<string, unknown> | undefined)?.[key];
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string')
    : [];
};

/** Did this search route the tactic through the structured `mitreTactic` filter? */
export const routedToTactic = (step: ToolCallStep, id: string, name: string): boolean =>
  filterValues(step, 'mitreTactic').some(
    (value) => value === id || value.toLowerCase() === name.toLowerCase()
  );

/** Tool results are `[{ type, data: { rules } }]`; pull `data.rules` of the first that has it. */
export const rulesFromStep = (step: ToolCallStep): CatalogRule[] => {
  const results = Array.isArray(step?.results) ? step.results : [];
  for (const result of results) {
    const rules = (result as { data?: { rules?: unknown } })?.data?.rules;
    if (Array.isArray(rules)) return rules as CatalogRule[];
  }
  return [];
};

/** A rule covers a tactic if any MITRE threat entry names it (rules are multi-tactic). */
export const coversTactic = (rule: CatalogRule, id: string, name: string): boolean =>
  Array.isArray(rule?.threat) &&
  rule.threat.some((entry) => entry?.tactic?.id === id || entry?.tactic?.name === name);

export const catalogTagsFromStep = (step: ToolCallStep): string[] => {
  const results = Array.isArray(step?.results) ? step.results : [];
  for (const result of results) {
    const buckets = (result as { data?: { tags?: unknown } })?.data?.tags;
    if (Array.isArray(buckets)) {
      return buckets
        .map((tag) => (tag as { value?: unknown })?.value)
        .filter((value): value is string => typeof value === 'string');
    }
  }
  return [];
};

export const CANONICAL_TACTICS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'TA0001', name: 'Initial Access' },
  { id: 'TA0002', name: 'Execution' },
  { id: 'TA0003', name: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation' },
  { id: 'TA0005', name: 'Stealth' },
  { id: 'TA0006', name: 'Credential Access' },
  { id: 'TA0007', name: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement' },
  { id: 'TA0009', name: 'Collection' },
  { id: 'TA0010', name: 'Exfiltration' },
  { id: 'TA0011', name: 'Command and Control' },
  { id: 'TA0040', name: 'Impact' },
  { id: 'TA0042', name: 'Resource Development' },
  { id: 'TA0043', name: 'Reconnaissance' },
  { id: 'TA0112', name: 'Defense Impairment' },
];

const CANONICAL_TACTIC_IDS = new Set(CANONICAL_TACTICS.map((tactic) => tactic.id));
const CANONICAL_TACTIC_NAMES = new Set(
  CANONICAL_TACTICS.map((tactic) => tactic.name.toLowerCase())
);

/** Grounded if it is a canonical TA-ID (exact) or a canonical tactic name (any case). */
export const isCanonicalTactic = (value: string): boolean =>
  CANONICAL_TACTIC_IDS.has(value) || CANONICAL_TACTIC_NAMES.has(value.toLowerCase());

export const relatesToIntegration = (rule: CatalogRule, pkg: string): boolean =>
  Array.isArray(rule?.related_integrations) &&
  rule.related_integrations.some((integration) => integration?.package === pkg);

// ---------- find-security-rules ----------

/** Severities the agent passed to a `find_rules` call (structured, not a substring match). */
export const severitiesFromStep = (step: ToolCallStep): string[] => {
  const severity = step?.params?.severity;
  return Array.isArray(severity)
    ? severity.filter((value): value is string => typeof value === 'string')
    : [];
};

/**
 * A second-turn call only counts as a fresh query if it asked for exactly the new severity.
 * `find_rules` validates `severity` against a lowercase enum, so no case folding is needed.
 */
export const queriesOnlySeverity = (step: ToolCallStep, severity: string): boolean => {
  const severities = severitiesFromStep(step);
  return severities.length > 0 && severities.every((value) => value === severity);
};

export const namesMentioned = (answer: string, names: readonly string[]): string[] =>
  names.filter((name) => answer.toLowerCase().includes(name.toLowerCase()));
