/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { anonymizeText } from './executor';
import {
  ANONYMIZATION_CONTEXT_CAPABILITY_KEY,
  type AnonymizationContextHandle,
} from '../../../anonymization/context_handle';
import { ENTITY_PATTERNS } from '../../../anonymization/default_rules';

const CustomPatternSchema = z.object({
  pattern: z.string().describe('Regex pattern to match PII'),
  entityClass: z.string().describe('Entity class label (e.g. EMPLOYEE_ID)'),
});

const inputSchema = z.object({
  sessionId: z
    .string()
    .describe('Session ID — used to look up the shared AnonymizationContext capability'),
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Text string or messages array to anonymize'),
  entities: z
    .array(z.string())
    .optional()
    .describe('Built-in entity class names to detect (IP, EMAIL, HOST_NAME)'),
  customPatterns: z.array(CustomPatternSchema).optional().describe('Additional custom regex rules'),
});

const outputSchema = z.object({
  output: z.union([z.string(), z.array(z.unknown())]).describe('Anonymized text or messages array'),
});

/**
 * Factory that creates the ai.pii step definition with access to the
 * anonymization context registry (keyed by sessionId).
 * The salt and tokenMap are never exposed in the YAML `with:` block.
 */
export const createAiPiiStepDefinition = (
  getCapabilities: (sessionId: string) => Record<string, unknown> | undefined
) =>
  createServerStepDefinition({
    id: 'ai.pii',
    label: 'Anonymize PII',
    description:
      'Detects and replaces PII in text or message arrays with deterministic HMAC tokens. ' +
      'Salt and token map are accessed via the AnonymizationContext capability — they never ' +
      'appear in the YAML workflow event.',
    category: StepCategory.Ai,
    inputSchema,
    outputSchema,
    handler: async ({ input: { sessionId, input, entities, customPatterns } }) => {
      const ctx = getCapabilities(sessionId)?.[ANONYMIZATION_CONTEXT_CAPABILITY_KEY] as
        | AnonymizationContextHandle
        | undefined;
      if (!ctx) {
        throw new Error(
          `[ai.pii] No AnonymizationContext found for session "${sessionId}". ` +
            'Ensure the hook was invoked with the anonymizationContext capability.'
        );
      }

      const rules = [
        ...(entities ?? []).flatMap((name) => {
          const p = ENTITY_PATTERNS[name];
          return p ? [p] : [];
        }),
        ...(customPatterns ?? []),
      ];

      if (typeof input === 'string') {
        const anonymized = anonymizeString(input, rules, ctx);
        return { output: { output: anonymized } };
      }

      const anonymizedMessages = (input as unknown[]).map((msg) =>
        anonymizeMessageContent(msg, rules, ctx)
      );
      return { output: { output: anonymizedMessages } };
    },
  });

function anonymizeString(
  text: string,
  rules: Array<{ pattern: string; entityClass: string }>,
  ctx: AnonymizationContextHandle
): string {
  const { anonymized, tokenMap } = anonymizeText({ text, rules, salt: ctx.salt });
  for (const [token, entry] of tokenMap) {
    ctx.tokenMap.set(token, entry);
  }
  return anonymized;
}

function anonymizeMessageContent(
  message: unknown,
  rules: Array<{ pattern: string; entityClass: string }>,
  ctx: AnonymizationContextHandle
): unknown {
  if (!message || typeof message !== 'object') return message;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content === 'string') {
    return { ...msg, content: anonymizeString(content, rules, ctx) };
  }
  if (Array.isArray(content)) {
    return {
      ...msg,
      content: content.map((part) => {
        if (
          part &&
          typeof part === 'object' &&
          typeof (part as Record<string, unknown>).text === 'string'
        ) {
          return {
            ...part,
            text: anonymizeString((part as Record<string, unknown>).text as string, rules, ctx),
          };
        }
        return part;
      }),
    };
  }
  return message;
}
