/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { Evaluator, TaskOutput } from '@kbn/evals';

export type AssertAttachmentFn = (attachment: RuleAttachmentData) => void | Promise<void>;

const getAssertAttachmentFn = (metadata: unknown): AssertAttachmentFn | undefined => {
  const value = (metadata as Record<string, unknown> | null)?.assertAttachment;
  return typeof value === 'function' ? (value as AssertAttachmentFn) : undefined;
};

const getRuleAttachment = (output: TaskOutput): RuleAttachmentData | undefined => {
  const value = (output as { ruleAttachment?: RuleAttachmentData })?.ruleAttachment;
  return value && typeof value === 'object' ? value : undefined;
};

export const createAssertAttachmentEvaluator = (): Evaluator => ({
  name: 'AssertAttachment',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const assertAttachment = getAssertAttachmentFn(metadata);
    if (!assertAttachment) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No assertAttachment expectation for this example',
      };
    }

    const attachment = getRuleAttachment(output as TaskOutput);
    if (!attachment) {
      return {
        score: 0,
        explanation:
          'assertAttachment was provided but no rule attachment data was found on the conversation',
        metadata: {
          conversationId: (output as { conversationId?: string })?.conversationId ?? null,
          attachmentCount: (output as { attachments?: unknown[] })?.attachments?.length ?? 0,
        },
      };
    }

    try {
      await assertAttachment(attachment);
      return {
        score: 1,
        metadata: {
          kind: attachment.kind,
          schedule: attachment.schedule,
          ruleId: attachment.id,
        },
      };
    } catch (error) {
      return {
        score: 0,
        explanation: error instanceof Error ? error.message : String(error),
        metadata: {
          kind: attachment.kind,
          schedule: attachment.schedule,
          ruleId: attachment.id,
        },
      };
    }
  },
});
