/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderConverseAttachment } from '@kbn/evals';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_TOOL_IDS,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
  getUniversalAlertingFailureDiagnosisSkillBadge,
} from './constants';
import {
  FAILURE_SCENARIOS,
  isFailureScenarioKey,
  type FailureScenario,
  type FailureScenarioKey,
} from './failure_diagnosis_data';
import type { RuleManagementExample } from './types';

/** A scenario rule saved before the test, with the stored rule the UI would attach. */
export interface SeededFailureRule {
  id: string;
  name: string;
  rule: RuleResponse;
  scenario: FailureScenario;
}

export type SeededFailureRules = Readonly<Record<FailureScenarioKey, SeededFailureRule>>;

export const hasAllFailureRules = (
  seeded: Partial<Record<FailureScenarioKey, SeededFailureRule>>
): seeded is SeededFailureRules =>
  Object.keys(FAILURE_SCENARIOS).every((key) => isFailureScenarioKey(key) && seeded[key] != null);

const EXECUTION_STARTED_AT = '2026-11-11T21:10:00.000Z';
const DEFAULT_DURATION_MS = 412;

const textAttachment = (
  id: string,
  description: string,
  value: unknown
): AgentBuilderConverseAttachment => {
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return {
    id,
    type: AttachmentType.text,
    description,
    data: {
      content: JSON.stringify({
        truncated: false,
        originalCharCount: content.length,
        contentCharCount: content.length,
        content,
      }),
    },
  };
};

/**
 * Attachments the execution history "Diagnose with AI" action sends: the saved rule by reference
 * (unless it cannot be read) and the failed execution as text.
 */
export const buildFailureAttachments = ({
  ruleId,
  ruleName,
  scenario,
  rule,
}: {
  ruleId: string;
  ruleName: string;
  scenario: FailureScenario;
  rule?: RuleResponse;
}): AgentBuilderConverseAttachment[] => {
  const executionId = `${ruleId}-execution`;
  const durationMs = scenario.durationMs ?? DEFAULT_DURATION_MS;
  return [
    ...(rule
      ? [{ id: `rule:${ruleId}`, type: RULE_ATTACHMENT_TYPE, origin: ruleId, data: rule }]
      : []),
    textAttachment(`rule-diagnose-error-${executionId}`, 'Execution error', {
      message: scenario.error,
    }),
    textAttachment(`rule-diagnose-details-${executionId}`, 'Execution details', {
      outcome: 'failure',
      reason: null,
      started_at: EXECUTION_STARTED_AT,
      ended_at: new Date(Date.parse(EXECUTION_STARTED_AT) + durationMs).toISOString(),
      duration_ms: durationMs,
      scheduled_delay_ms: 35,
      rule_version: rule ? 1 : null,
    }),
    textAttachment(`rule-diagnose-ids-${executionId}`, 'Rule / execution IDs', {
      ruleId,
      ruleName,
      executionId,
    }),
  ];
};

/** The first message the "Diagnose with AI" action sends, starting with the skill badge. */
export const buildDiagnosisPrompt = (ruleName: string, includeRuleDefinition: boolean): string => {
  const message = includeRuleDefinition
    ? `Diagnose why the rule ${ruleName} failed. Use the attached rule definition and the failed execution (error, reason, and timings). Explain the most likely root cause in plain language, then suggest how to fix it. If the fix involves changing the rule, show the corrected rule.`
    : `Diagnose why the rule ${ruleName} failed. Use the attached failed execution (error, reason, and timings). Explain the most likely root cause in plain language, then suggest how to fix it.`;
  return `${getUniversalAlertingFailureDiagnosisSkillBadge()} ${message}`;
};

export const NOT_SAVED_CRITERION =
  "The assistant does not claim the rule was saved; it directs the user to the rendered rule attachment's Update Rule action.";

export const NO_RULE_CHANGE_CRITERION =
  'The assistant does not rewrite the query or propose a changed rule; it says what the user, the index owner, or an administrator needs to do instead.';

export const NO_UNVERIFIED_CERTAINTY_CRITERION =
  'The assistant does not present a root cause as confirmed unless a tool call in this conversation verified it; otherwise it lists the possible causes and how to tell them apart.';

export const ACCESS_WORDING_CRITERION =
  'When it reports an index or mapping check, the assistant says the check reflects the access of the user in this conversation (never "its own access") and that the rule runs with the rule owner\'s API key, which can have different access.';

/**
 * - `expected`: the cause is a rule definition problem, so the agent edits and renders the rule.
 * - `forbidden`: privileges, mappings, server limits or platform errors; the rule must not change.
 * - `either`: the cause is ambiguous from the error alone; no tool expectation.
 */
export type RuleChangeExpectation = 'expected' | 'forbidden' | 'either';

const ruleChangeOutput = (
  ruleChange: RuleChangeExpectation
): Pick<
  RuleManagementExample['output'],
  'expectedToolIds' | 'notExpectedToolIds' | 'expectRenderAttachment'
> => {
  if (ruleChange === 'expected') {
    return {
      expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
      expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
    };
  }
  if (ruleChange === 'forbidden') {
    return { notExpectedToolIds: [ALERTING_TOOL_IDS.manageRule] };
  }
  return {};
};

const ruleChangeCriteria = (ruleChange: RuleChangeExpectation): string[] => {
  if (ruleChange === 'expected') {
    return [
      'The assistant applies a minimal fix with manage_rule on the attached rule, ends with a validate operation that succeeds, and renders the corrected rule.',
      NOT_SAVED_CRITERION,
    ];
  }
  if (ruleChange === 'forbidden') {
    return [NO_RULE_CHANGE_CRITERION];
  }
  return [];
};

/**
 * The "Diagnose with AI" handoff for one seeded failure. With `includeRule: false` it stands for a
 * deleted rule: no rule attachment, and a rule id that does not resolve.
 */
export const diagnosisInput = (
  seeded: SeededFailureRule,
  { includeRule = true }: { includeRule?: boolean } = {}
): RuleManagementExample['input'] => ({
  turns: [buildDiagnosisPrompt(seeded.name, includeRule)],
  attachments: buildFailureAttachments({
    ruleId: includeRule ? seeded.id : `${seeded.id}-deleted`,
    ruleName: seeded.name,
    scenario: seeded.scenario,
    rule: includeRule ? seeded.rule : undefined,
  }),
});

/** A "Diagnose with AI" handoff for one seeded failure, as sent from the execution history. */
export const diagnosisExample = ({
  seeded,
  criteria,
  ruleChange,
  expectedAnyOfToolIds,
}: {
  seeded: SeededFailureRule;
  criteria: string[];
  ruleChange: RuleChangeExpectation;
  expectedAnyOfToolIds?: readonly string[];
}): RuleManagementExample => ({
  input: diagnosisInput(seeded),
  output: {
    criteria: [...criteria, ...ruleChangeCriteria(ruleChange)],
    expectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
    ...(expectedAnyOfToolIds ? { expectedAnyOfToolIds } : {}),
    ...ruleChangeOutput(ruleChange),
  },
});
