/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_ATTACHMENT_TYPE, type RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_TOOL_IDS,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
  getUniversalAlertingFailureDiagnosisSkillBadge,
} from './constants';
import {
  buildDiagnosisPrompt,
  buildFailureAttachments,
  diagnosisExample,
  diagnosisInput,
  hasAllFailureRules,
  type SeededFailureRule,
} from './failure_diagnosis';
import {
  COVERED_FAILURE_SCENARIOS,
  FAILURE_SCENARIOS,
  esqlPosition,
  isFailureScenarioKey,
} from './failure_diagnosis_data';

const { breachSegmentTypo } = COVERED_FAILURE_SCENARIOS;

const savedRule: RuleResponse = {
  ...breachSegmentTypo.rule,
  id: 'rule-1',
  version: 1,
  enabled: false,
  created_by: null,
  created_at: '2026-11-11T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-11-11T00:00:00.000Z',
};

const seeded: SeededFailureRule = {
  id: 'rule-1',
  name: breachSegmentTypo.rule.metadata.name,
  rule: savedRule,
  scenario: breachSegmentTypo,
};

const textContent = (attachment: { data: Record<string, unknown> }): unknown => {
  const { content } = attachment.data;
  if (typeof content !== 'string') {
    throw new Error('text attachment content must be a string');
  }
  return JSON.parse(JSON.parse(content).content);
};

describe('esqlPosition', () => {
  it('reports a 1-based line and column', () => {
    expect(esqlPosition('FROM logs | WHERE x > 1', 'x >')).toBe('line 1:19');
  });

  it('counts columns from the start of the token line', () => {
    expect(esqlPosition('FROM logs\n| WHERE x > 1', 'x >')).toBe('line 2:9');
  });

  it('throws when the token is not in the query', () => {
    expect(() => esqlPosition('FROM logs', 'missing')).toThrow(/not found/);
  });
});

describe('FAILURE_SCENARIOS', () => {
  it.each(Object.entries(FAILURE_SCENARIOS))('%s has a rule name and an error', (_key, value) => {
    expect(value.rule.metadata.name).toMatch(/^Eval diagnosis: /);
    expect(value.error.length).toBeGreaterThan(0);
  });

  it('uses a unique rule name per scenario', () => {
    const names = Object.values(FAILURE_SCENARIOS).map(({ rule }) => rule.metadata.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('reports the breach segment typo at its position in the composed query', () => {
    expect(breachSegmentTypo.error).toContain('Unknown column [server_error]');
    expect(breachSegmentTypo.error).toMatch(/line \d+:\d+: Unknown column/);
  });

  it('recognizes scenario keys', () => {
    expect(isFailureScenarioKey('breachSegmentTypo')).toBe(true);
    expect(isFailureScenarioKey('toString')).toBe(false);
  });
});

describe('hasAllFailureRules', () => {
  it('is false until every scenario has a seeded rule', () => {
    expect(hasAllFailureRules({ breachSegmentTypo: seeded })).toBe(false);
  });

  it('is true when every scenario has a seeded rule', () => {
    const all = Object.fromEntries(Object.keys(FAILURE_SCENARIOS).map((key) => [key, seeded]));
    expect(hasAllFailureRules(all)).toBe(true);
  });
});

describe('buildFailureAttachments', () => {
  it('attaches the saved rule by reference, then the error, details and ids', () => {
    const attachments = buildFailureAttachments({
      ruleId: 'rule-1',
      ruleName: seeded.name,
      scenario: breachSegmentTypo,
      rule: savedRule,
    });

    expect(attachments.map(({ type }) => type)).toEqual([
      RULE_ATTACHMENT_TYPE,
      'text',
      'text',
      'text',
    ]);
    expect(attachments[0]).toEqual(
      expect.objectContaining({ id: 'rule:rule-1', origin: 'rule-1', data: savedRule })
    );
    expect(textContent(attachments[1])).toEqual({ message: breachSegmentTypo.error });
    expect(textContent(attachments[2])).toEqual(
      expect.objectContaining({ outcome: 'failure', reason: null, rule_version: 1 })
    );
    expect(textContent(attachments[3])).toEqual(
      expect.objectContaining({ ruleId: 'rule-1', ruleName: seeded.name })
    );
  });

  it('omits the rule attachment when the rule cannot be read', () => {
    const attachments = buildFailureAttachments({
      ruleId: 'rule-1',
      ruleName: seeded.name,
      scenario: breachSegmentTypo,
    });

    expect(attachments.map(({ type }) => type)).toEqual(['text', 'text', 'text']);
    expect(textContent(attachments[1])).toEqual(expect.objectContaining({ rule_version: null }));
  });
});

describe('buildDiagnosisPrompt', () => {
  it('starts with the skill badge', () => {
    expect(buildDiagnosisPrompt('My rule', true)).toMatch(
      new RegExp(`^\\[/${UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID}\\]`)
    );
    expect(buildDiagnosisPrompt('My rule', true)).toContain(
      getUniversalAlertingFailureDiagnosisSkillBadge()
    );
  });

  it('only mentions the rule definition when it is attached', () => {
    expect(buildDiagnosisPrompt('My rule', true)).toContain('attached rule definition');
    expect(buildDiagnosisPrompt('My rule', false)).not.toContain('rule definition');
  });
});

describe('diagnosisInput', () => {
  it('uses a rule id that does not resolve when the rule is omitted', () => {
    const { attachments = [] } = diagnosisInput(seeded, { includeRule: false });
    expect(attachments.some(({ type }) => type === RULE_ATTACHMENT_TYPE)).toBe(false);
    const [, , ids] = attachments;
    expect(textContent(ids)).toEqual(expect.objectContaining({ ruleId: 'rule-1-deleted' }));
  });
});

describe('diagnosisExample', () => {
  it('expects manage_rule and a rendered rule when the fix is a rule change', () => {
    const { output } = diagnosisExample({ seeded, criteria: ['c'], ruleChange: 'expected' });
    expect(output.expectedSkills).toEqual([UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID]);
    expect(output.expectedToolIds).toEqual([ALERTING_TOOL_IDS.manageRule]);
    expect(output.expectRenderAttachment).toEqual([RULE_ATTACHMENT_TYPE]);
    expect(output.notExpectedToolIds).toBeUndefined();
  });

  it('forbids manage_rule when the fix is not a rule change', () => {
    const { output } = diagnosisExample({ seeded, criteria: ['c'], ruleChange: 'forbidden' });
    expect(output.notExpectedToolIds).toEqual([ALERTING_TOOL_IDS.manageRule]);
    expect(output.expectedToolIds).toBeUndefined();
  });

  it('sets no tool expectation when the cause is ambiguous', () => {
    const { output } = diagnosisExample({ seeded, criteria: ['c'], ruleChange: 'either' });
    expect(output.criteria).toEqual(['c']);
    expect(output.expectedToolIds).toBeUndefined();
    expect(output.notExpectedToolIds).toBeUndefined();
  });
});
