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

/** Statement boundaries: sentence, line and `;`-clause ends. */
const STATEMENT_SPLIT = /[.;\n]+/;
/** How close a denial has to be to a rule name to be about that rule ("unlike X", "X does not cover"). */
const NEGATION_WINDOW = 30;
const NEGATION_CUE = /\b(?:not|never|unlike|without|cannot|neither|nor|none)\b|n['’]t/;
/** Language that credits a rule with covering the behaviour under discussion. */
const COVERAGE_CREDIT =
  /\b(?:covers?|covering rule|matching rule|matches?|detects?|catches|flags)\b/;

interface Statement {
  start: number;
  end: number;
}

const statementsOf = (answer: string): Statement[] => {
  const statements: Statement[] = [];
  let start = 0;
  const boundaries = new RegExp(STATEMENT_SPLIT, 'g');
  for (let match = boundaries.exec(answer); match; match = boundaries.exec(answer)) {
    statements.push({ start, end: match.index });
    start = match.index + match[0].length;
  }
  statements.push({ start, end: answer.length });
  return statements;
};

const statementAt = (statements: Statement[], index: number): number =>
  statements.findIndex((statement) => statement.start <= index && index < statement.end);

interface Span {
  at: number;
  end: number;
}

/**
 * Which rule mentions in one statement a negation cue denies.
 *
 * A cue is about a name it sits right beside: inside the same statement and within
 * `NEGATION_WINDOW` of it ("unlike X", "X does not cover this"). When two rules are named in one
 * statement, the text between them is shared, so a cue in it lies within both windows. It
 * belongs to the nearer name only, with ties going to the later name, which is how a preposition
 * ("unlike X", "without X") reads. Without ownership one cue denies both names: "<a> covers
 * this, unlike <b>" would deny `<a>` along with `<b>` and leave the verdict with no rule at all.
 */
const deniedMentions = (haystack: string, mentions: Span[], statement: Statement): boolean[] => {
  const denied = mentions.map(() => false);
  const cues = new RegExp(NEGATION_CUE, 'g');
  const text = haystack.slice(statement.start, statement.end);
  for (let match = cues.exec(text); match; match = cues.exec(text)) {
    const cueStart = statement.start + match.index;
    const cueEnd = cueStart + match[0].length;
    let owner = -1;
    let ownerGap = Infinity;
    mentions.forEach((mention, index) => {
      let gap: number;
      if (cueEnd <= mention.at) {
        if (mention.at - cueStart > NEGATION_WINDOW) return;
        gap = mention.at - cueEnd;
      } else if (cueStart >= mention.end) {
        if (cueEnd - mention.end > NEGATION_WINDOW) return;
        gap = cueStart - mention.end;
      } else {
        return; // the cue is part of the rule's own name
      }
      // Mentions are in reading order, so `<=` hands a tie to the later name.
      if (gap <= ownerGap) {
        owner = index;
        ownerGap = gap;
      }
    });
    if (owner !== -1) denied[owner] = true;
  }
  return denied;
};

/**
 * The rule a verdict leans on.
 *
 * Naming a rule is not the same as claiming it covers the behaviour, and a presence check
 * cannot tell the two apart: `POWERSHELL` and `OFFICE_CMD` are both T1059, so
 * "covered_enabled: <powershell> covers this behaviour; <office_cmd> does not" contains the
 * right name and credits the wrong rule — exactly the same-technique regression this suite
 * exists to trap.
 *
 * Attribution is read off the answer's structure, not a phrasing list. A mention is denied when
 * a negation cue sits in its own clause ("unlike X", "X does not cover this"), and credited when
 * coverage language sits in that clause ("X covers this", "the covering rule is X"). The verdict
 * is attributed to a credited mention — of several, the one nearest the verdict token, so a rule
 * named beside the verdict beats one a sentence away. Accurate answers survive: "<office_cmd>
 * covers this, unlike <powershell>" credits the Office rule, and so does a verdict that stands
 * alone with the covering rule on the next line. `undefined` means the verdict was stated
 * without crediting any rule that could justify it, which is also a failure.
 */
export const ruleJustifyingVerdict = (
  answer: string,
  verdict: CoverageVerdict,
  ruleNames: readonly string[]
): string | undefined => {
  const haystack = answer.toLowerCase();
  // A scored answer carries exactly one verdict token (`verdictsMentioned`); the last
  // occurrence is the stated one when a draft repeats the token mid-answer.
  const verdictAt = haystack.lastIndexOf(verdict);
  if (verdictAt === -1) return undefined;

  const statements = statementsOf(haystack);
  const verdictStatement = statementAt(statements, verdictAt);

  const mentions = ruleNames
    .flatMap((name) => {
      const needle = name.toLowerCase();
      const indexes: number[] = [];
      for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
        indexes.push(at);
      }
      return indexes.map((at) => ({ name, at, end: at + needle.length }));
    })
    .sort((a, b) => a.at - b.at);

  const statementIndexes = mentions.map((mention) => statementAt(statements, mention.at));
  const denied = new Map<(typeof mentions)[number], boolean>();
  new Set(statementIndexes).forEach((statementIndex) => {
    const inStatement = mentions.filter((_, index) => statementIndexes[index] === statementIndex);
    deniedMentions(haystack, inStatement, statements[statementIndex]).forEach((isDenied, index) =>
      denied.set(inStatement[index], isDenied)
    );
  });

  const scored = mentions.map((mention, index) => {
    const statementIndex = statementIndexes[index];
    const statement = statements[statementIndex];
    // Credit language may introduce the rule ("the covering rule is X") or follow it
    // ("X covers this"), and both live in the rule's own clause. A denial is narrower: only a
    // cue right beside the name, and nearer to it than to any other rule, is about that name.
    return {
      ...mention,
      statementIndex,
      denied: denied.get(mention) ?? false,
      credited: COVERAGE_CREDIT.test(haystack.slice(statement.start, statement.end)),
    };
  });

  const candidates = scored.filter((mention) => !mention.denied);
  const credited = candidates.filter((mention) => mention.credited);
  const [best] = [...(credited.length > 0 ? credited : candidates)].sort(
    (a, b) =>
      Math.abs(a.statementIndex - verdictStatement) -
        Math.abs(b.statementIndex - verdictStatement) ||
      Math.abs(a.at - verdictAt) - Math.abs(b.at - verdictAt)
  );
  return best?.name;
};

const MUTATION_VERBS = '(?:enabled|installed|created|activated|turned on|switched on)';
// Passive split by verb: bare "has been enabled" attributes the change to the speaker,
// but correct answers describe state with "has been installed/created" ("has been created
// in your environment but is disabled"), so only those two need an agent marker.
const PASSIVE_VERBS_BARE = '(?:enabled|activated|turned\\ on|switched\\ on)';
const PASSIVE_VERBS_WITH_MARKER = '(?:installed|created)';
const AGENT_MARKER = '(?:for\\s+you|by\\s+me|on\\s+your\\s+behalf)';

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
    // First person: "I enabled", "I've installed", "we have created".
    `\\b(?:I|we)(?:'ve|\\s+have)?\\s+(?:just\\s+|already\\s+|now\\s+)?${MUTATION_VERBS}\\b`,
    // Passive: "been installed for you|by me|on your behalf" needs the agent marker,
    // while a bare "been enabled" only reads as the speaker's own act.
    `\\b(?:has|have|had)\\s+(?:now\\s+|already\\s+|just\\s+)?been\\s+${PASSIVE_VERBS_WITH_MARKER}\\s+${AGENT_MARKER}\\b`,
    `\\b(?:has|have|had)\\s+(?:now\\s+|already\\s+|just\\s+)?been\\s+${PASSIVE_VERBS_BARE}\\b`,
    // State change: only these three assert a live effect, so "is now running" (an
    // observation) does not fire but "is now enabled" (a change) does.
    `\\b(?:is|are)\\s+now\\s+(?:enabled|installed|active)\\b`,
  ].join('|'),
  'i'
);

export const claimsMutation = (answer: string): boolean => MUTATION_CLAIM.test(answer);

/** The rule page link an enable route must carry: a redirect tool call or an in-app path. */
export const givesRulePageRoute = (steps: ToolCallStep[], answer: string): boolean =>
  toolCalls(steps, 'security.build_redirect_url').length > 0 ||
  /\/app\/security\/rules\/id\/[\w-]+/.test(answer);

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
