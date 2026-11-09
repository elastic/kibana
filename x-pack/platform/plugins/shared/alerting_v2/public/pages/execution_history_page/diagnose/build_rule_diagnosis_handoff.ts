/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { AttachmentGroup, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { getUniversalAlertingFailureDiagnosisSkillBadge } from '@kbn/alerting-v2-constants';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { RuleExecutionView, RuleResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

/** Max serialized characters per diagnosis attachment value (never silent). */
export const DIAGNOSIS_ATTACHMENT_MAX_CHARS = 32_000;

/**
 * Everything the diagnosis handoff needs about one failed rule execution. `rule` is absent when
 * the saved rule can't be read (deleted, or no access), in which case only the error text is sent.
 */
export interface RuleDiagnosisContext {
  ruleId: string;
  ruleName: string;
  executionId: string;
  startedAt: string;
  endedAt: string;
  outcome: string;
  reason?: string;
  durationMs: number;
  scheduledDelayMs: number;
  ruleVersion?: number;
  error: NonNullable<RuleExecutionView['error']> | { message: string };
  rule?: RuleResponse | null;
}

export interface BuildRuleDiagnosisContextInput {
  execution: RuleExecutionView;
  ruleName: string;
  rule?: RuleResponse | null;
}

/** Assemble the diagnosis context from a failed execution row. Pure. */
export const buildRuleDiagnosisContext = ({
  execution,
  ruleName,
  rule,
}: BuildRuleDiagnosisContextInput): RuleDiagnosisContext => ({
  ruleId: execution.rule.id,
  ruleName,
  executionId: execution.id,
  startedAt: execution.started_at,
  endedAt: execution.ended_at,
  outcome: execution.outcome,
  reason: execution.reason,
  durationMs: execution.timings.duration_ms,
  scheduledDelayMs: execution.timings.scheduled_delay_ms,
  ruleVersion: execution.rule.version,
  error: execution.error ?? { message: 'Unknown error' },
  rule: rule ?? null,
});

export interface TruncatedAttachmentPayload {
  truncated: boolean;
  originalCharCount: number;
  contentCharCount: number;
  content: string;
}

/**
 * Serialize a value and truncate oversized payloads with an explicit marker.
 * Truncation is also flagged on the returned metadata object.
 */
export const serializeDiagnosisAttachmentContent = (
  value: unknown,
  maxChars: number = DIAGNOSIS_ATTACHMENT_MAX_CHARS
): TruncatedAttachmentPayload => {
  const raw = (() => {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  })();

  const originalCharCount = raw.length;
  if (originalCharCount <= maxChars) {
    return {
      truncated: false,
      originalCharCount,
      contentCharCount: originalCharCount,
      content: raw,
    };
  }

  const marker = `…[truncated, ${maxChars} of ${originalCharCount} chars]`;
  const keep = Math.max(0, maxChars - marker.length);
  const content = `${raw.slice(0, keep)}${marker}`;

  return {
    truncated: true,
    originalCharCount,
    contentCharCount: content.length,
    content,
  };
};

const textAttachment = ({
  id,
  description,
  value,
}: {
  id: string;
  description: string;
  value: unknown;
}): AttachmentInput => {
  const payload = serializeDiagnosisAttachmentContent(value);
  const descriptionWithTruncation = payload.truncated
    ? i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.truncatedDescription', {
        defaultMessage: '{description} (truncated, {kept} of {total} chars)',
        values: {
          description,
          kept: DIAGNOSIS_ATTACHMENT_MAX_CHARS,
          total: payload.originalCharCount,
        },
      })
    : description;

  return {
    id,
    type: AttachmentType.text,
    description: descriptionWithTruncation,
    data: {
      // Structured envelope so the agent sees truncation metadata, not only the body.
      content: JSON.stringify(payload),
    },
  };
};

/**
 * Build the Agent Builder attachments for a diagnosis handoff: one group chip in the UI, with the
 * saved rule (by reference, when readable) and individual text items the agent can read.
 */
export const buildRuleDiagnosisAttachments = (context: RuleDiagnosisContext): AttachmentGroup[] => {
  const { executionId, ruleId, rule } = context;

  const items: AttachmentInput[] = [];

  if (rule != null) {
    items.push({
      id: `rule:${ruleId}`,
      type: RULE_ATTACHMENT_TYPE,
      origin: ruleId,
      data: rule,
    } as AttachmentInput);
  }

  items.push(
    textAttachment({
      id: `rule-diagnose-error-${executionId}`,
      description: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.error', {
        defaultMessage: 'Execution error',
      }),
      value: context.error,
    }),
    textAttachment({
      id: `rule-diagnose-details-${executionId}`,
      description: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.details', {
        defaultMessage: 'Execution details',
      }),
      value: {
        outcome: context.outcome,
        reason: context.reason ?? null,
        started_at: context.startedAt,
        ended_at: context.endedAt,
        duration_ms: context.durationMs,
        scheduled_delay_ms: context.scheduledDelayMs,
        rule_version: context.ruleVersion ?? null,
      },
    }),
    textAttachment({
      id: `rule-diagnose-ids-${executionId}`,
      description: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.ids', {
        defaultMessage: 'Rule / execution IDs',
      }),
      value: { ruleId, ruleName: context.ruleName, executionId },
    })
  );

  return [
    {
      type: 'group',
      id: `rule-diagnose-${executionId}`,
      label: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.groupLabel', {
        defaultMessage: 'Rule execution failure context',
      }),
      items,
    },
  ];
};

/**
 * Visible first user message for the diagnosis handoff. Starts with the skill badge so the chat
 * renders a skill chip and the agent loads the `universal-alerting-failure-diagnosis` skill. Omits the rule
 * definition clause when the rule attachment is absent.
 */
export const buildRuleDiagnosisPrompt = (
  ruleName: string,
  includeRuleDefinition: boolean
): string => {
  const message = includeRuleDefinition
    ? i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.promptWithRule', {
        defaultMessage:
          'Diagnose why the rule {ruleName} failed. Use the attached rule definition and the failed execution (error, reason, and timings). Explain the most likely root cause in plain language, then suggest how to fix it. If the fix involves changing the rule, show the corrected rule.',
        values: { ruleName },
      })
    : i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.prompt', {
        defaultMessage:
          'Diagnose why the rule {ruleName} failed. Use the attached failed execution (error, reason, and timings). Explain the most likely root cause in plain language, then suggest how to fix it.',
        values: { ruleName },
      });

  return `${getUniversalAlertingFailureDiagnosisSkillBadge()} ${message}`;
};

export const buildRuleDiagnosisConversationTitle = (ruleName: string, startedAt: string): string =>
  i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.conversationTitle', {
    defaultMessage: 'Diagnose: {ruleName} — {startedAt}',
    values: { ruleName, startedAt },
  });

export interface RuleDiagnosisHandoffOpenChatPayload {
  conversationTitle: string;
  initialMessage: string;
  sessionTag: string;
  attachments: AttachmentGroup[];
}

export const buildRuleDiagnosisHandoffPayload = (
  context: RuleDiagnosisContext
): RuleDiagnosisHandoffOpenChatPayload => ({
  conversationTitle: buildRuleDiagnosisConversationTitle(context.ruleName, context.startedAt),
  initialMessage: buildRuleDiagnosisPrompt(context.ruleName, context.rule != null),
  sessionTag: `rule-execution-diagnose:${context.executionId}`,
  attachments: buildRuleDiagnosisAttachments(context),
});
