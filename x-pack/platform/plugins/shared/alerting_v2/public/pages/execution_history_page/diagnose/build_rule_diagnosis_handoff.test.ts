/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleFailureDiagnosisSkillBadge } from '@kbn/alerting-v2-constants';
import type { RuleExecutionView, RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  DIAGNOSIS_ATTACHMENT_MAX_CHARS,
  buildRuleDiagnosisAttachments,
  buildRuleDiagnosisContext,
  buildRuleDiagnosisHandoffPayload,
  buildRuleDiagnosisPrompt,
  serializeDiagnosisAttachmentContent,
} from './build_rule_diagnosis_handoff';

const execution: RuleExecutionView = {
  id: 'exec-1',
  rule: { id: 'rule-1', version: 3 },
  started_at: '2026-11-09T16:00:00.000Z',
  ended_at: '2026-11-09T16:00:01.000Z',
  timings: { duration_ms: 1000, scheduled_delay_ms: 12 },
  outcome: 'failure',
  error: { message: 'verification_exception: Unknown column [nonexistent_field]' },
};

const rule = { id: 'rule-1', metadata: { name: 'My rule' } } as unknown as RuleResponse;

const itemsOf = (group: ReturnType<typeof buildRuleDiagnosisAttachments>[number]) =>
  (group as { items: Array<Record<string, any>> }).items;

describe('buildRuleDiagnosisContext', () => {
  it('maps the failed execution row and the readable rule', () => {
    expect(buildRuleDiagnosisContext({ execution, ruleName: 'My rule', rule })).toEqual({
      ruleId: 'rule-1',
      ruleName: 'My rule',
      executionId: 'exec-1',
      startedAt: '2026-11-09T16:00:00.000Z',
      endedAt: '2026-11-09T16:00:01.000Z',
      outcome: 'failure',
      reason: undefined,
      durationMs: 1000,
      scheduledDelayMs: 12,
      ruleVersion: 3,
      error: { message: 'verification_exception: Unknown column [nonexistent_field]' },
      rule,
    });
  });

  it('falls back to a placeholder error and a null rule', () => {
    const context = buildRuleDiagnosisContext({
      execution: { ...execution, error: undefined },
      ruleName: 'rule-1',
    });

    expect(context.error).toEqual({ message: 'Unknown error' });
    expect(context.rule).toBeNull();
  });
});

describe('serializeDiagnosisAttachmentContent', () => {
  it('returns short values untouched', () => {
    expect(serializeDiagnosisAttachmentContent('abc')).toEqual({
      truncated: false,
      originalCharCount: 3,
      contentCharCount: 3,
      content: 'abc',
    });
  });

  it('truncates oversized values with an explicit marker and flags it', () => {
    const payload = serializeDiagnosisAttachmentContent(
      'x'.repeat(DIAGNOSIS_ATTACHMENT_MAX_CHARS + 500)
    );

    expect(payload.truncated).toBe(true);
    expect(payload.originalCharCount).toBe(DIAGNOSIS_ATTACHMENT_MAX_CHARS + 500);
    expect(payload.contentCharCount).toBe(DIAGNOSIS_ATTACHMENT_MAX_CHARS);
    expect(payload.content).toContain(
      `…[truncated, ${DIAGNOSIS_ATTACHMENT_MAX_CHARS} of ${
        DIAGNOSIS_ATTACHMENT_MAX_CHARS + 500
      } chars]`
    );
  });

  it('serializes objects as JSON', () => {
    expect(serializeDiagnosisAttachmentContent({ a: 1 }).content).toBe('{\n  "a": 1\n}');
  });
});

describe('buildRuleDiagnosisAttachments', () => {
  it('builds one group with the rule by reference followed by the text items', () => {
    const context = buildRuleDiagnosisContext({ execution, ruleName: 'My rule', rule });
    const groups = buildRuleDiagnosisAttachments(context);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        type: 'group',
        id: 'rule-diagnose-exec-1',
        label: 'Rule execution failure context',
      })
    );
    const items = itemsOf(groups[0]);
    expect(items.map((item) => item.id)).toEqual([
      'rule:rule-1',
      'rule-diagnose-error-exec-1',
      'rule-diagnose-details-exec-1',
      'rule-diagnose-ids-exec-1',
    ]);
    expect(items[0]).toEqual(
      expect.objectContaining({ type: 'platform.alerting.rule', origin: 'rule-1', data: rule })
    );
  });

  it('omits the rule attachment when the rule could not be read', () => {
    const items = itemsOf(
      buildRuleDiagnosisAttachments(buildRuleDiagnosisContext({ execution, ruleName: 'rule-1' }))[0]
    );

    expect(items.map((item) => item.id)).toEqual([
      'rule-diagnose-error-exec-1',
      'rule-diagnose-details-exec-1',
      'rule-diagnose-ids-exec-1',
    ]);
  });

  it('puts the error message in a structured text envelope', () => {
    const items = itemsOf(
      buildRuleDiagnosisAttachments(
        buildRuleDiagnosisContext({ execution, ruleName: 'My rule', rule })
      )[0]
    );
    const errorItem = items.find((item) => item.id === 'rule-diagnose-error-exec-1')!;

    expect(errorItem.description).toBe('Execution error');
    expect(JSON.parse(errorItem.data.content)).toEqual(
      expect.objectContaining({ truncated: false })
    );
    expect(errorItem.data.content).toContain('Unknown column [nonexistent_field]');
  });

  it('flags truncation in the description of oversized items', () => {
    const items = itemsOf(
      buildRuleDiagnosisAttachments(
        buildRuleDiagnosisContext({
          execution: {
            ...execution,
            error: { message: 'x'.repeat(DIAGNOSIS_ATTACHMENT_MAX_CHARS * 2) },
          },
          ruleName: 'My rule',
          rule,
        })
      )[0]
    );
    const errorItem = items.find((item) => item.id === 'rule-diagnose-error-exec-1')!;

    expect(errorItem.description).toMatch(/^Execution error \(truncated, 32000 of \d+ chars\)$/);
    expect(JSON.parse(errorItem.data.content).truncated).toBe(true);
  });
});

describe('buildRuleDiagnosisPrompt', () => {
  it('starts with the skill badge so the chat invokes the rule-failure-diagnosis skill', () => {
    const badge = getRuleFailureDiagnosisSkillBadge();

    expect(buildRuleDiagnosisPrompt('My rule', true).startsWith(`${badge} `)).toBe(true);
    expect(buildRuleDiagnosisPrompt('My rule', false).startsWith(`${badge} `)).toBe(true);
  });

  it('mentions the attached rule definition only when the rule is attached', () => {
    expect(buildRuleDiagnosisPrompt('My rule', true)).toContain('attached rule definition');
    expect(buildRuleDiagnosisPrompt('My rule', true)).toContain('show the corrected rule');
    expect(buildRuleDiagnosisPrompt('My rule', false)).not.toContain('attached rule definition');
    expect(buildRuleDiagnosisPrompt('My rule', false)).toContain('attached failed execution');
  });

  it('keeps the error text out of the visible prompt', () => {
    expect(buildRuleDiagnosisPrompt('My rule', true)).not.toContain('nonexistent_field');
  });
});

describe('buildRuleDiagnosisHandoffPayload', () => {
  it('assembles title, prompt, session tag, and attachments', () => {
    const payload = buildRuleDiagnosisHandoffPayload(
      buildRuleDiagnosisContext({ execution, ruleName: 'My rule', rule })
    );

    expect(payload.conversationTitle).toBe('Diagnose: My rule — 2026-11-09T16:00:00.000Z');
    expect(payload.sessionTag).toBe('rule-execution-diagnose:exec-1');
    expect(payload.initialMessage).toContain('My rule');
    expect(payload.attachments).toHaveLength(1);
  });
});
