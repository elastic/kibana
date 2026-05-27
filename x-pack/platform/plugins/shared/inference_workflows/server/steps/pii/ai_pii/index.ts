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
import { ENTITY_PATTERNS } from '../../../anonymization/default_rules';

const TokenEntrySchema = z.object({
  original: z.string(),
  entityClass: z.string(),
});

const TokenMapSchema = z.record(z.string(), TokenEntrySchema);

const CustomPatternSchema = z.object({
  pattern: z.string().describe('Regex pattern to match PII'),
  entityClass: z.string().describe('Entity class label (e.g. EMPLOYEE_ID)'),
});

const inputSchema = z.object({
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Text string or messages array to anonymize'),
  salt: z.string().describe('Per-session salt derived from the session identifier'),
  tokenMap: TokenMapSchema.nullish().describe(
    "Token map from a preceding ai.pii step; entries are merged into this step's output"
  ),
  entities: z
    .array(z.string())
    .optional()
    .describe('Built-in entity class names to detect (IP, EMAIL, HOST_NAME)'),
  customPatterns: z.array(CustomPatternSchema).optional().describe('Additional custom regex rules'),
  systemPromptInstruction: z
    .string()
    .optional()
    .describe(
      'Custom wording for the [Anonymization context] instruction injected into the system prompt. ' +
        'When omitted the inference plugin generates a default instruction from the entity types present. ' +
        'Echoed through to the step output so invoke_before_completion.ts can pick it up.'
    ),
});

const outputSchema = z.object({
  output: z.union([z.string(), z.array(z.unknown())]).describe('Anonymized text or messages array'),
  tokenMap: TokenMapSchema.describe(
    'Merged token map including all PII tokens discovered in this and any preceding ai.pii steps'
  ),
  systemPromptInstruction: z
    .string()
    .optional()
    .describe('Custom instruction wording echoed from input, if provided'),
});

export const createAiPiiStepDefinition = () =>
  createServerStepDefinition({
    id: 'ai.pii',
    label: 'Anonymize PII',
    requiresCapabilities: [],
    description:
      'Detects and replaces PII in text or message arrays with deterministic HMAC tokens. ' +
      'Salt is passed as a step input from the workflow event; the accumulated token map ' +
      'is returned as step output and chained to the next step or workflow output.',
    category: StepCategory.Ai,
    inputSchema,
    outputSchema,
    handler: async (handlerCtx) => {
      const {
        input,
        salt,
        tokenMap: inputTokenMap,
        entities,
        customPatterns,
        systemPromptInstruction,
      } = handlerCtx.input as {
        input: string | unknown[];
        salt: string;
        tokenMap?: Record<string, { original: string; entityClass: string }> | null;
        entities?: string[];
        customPatterns?: Array<{ pattern: string; entityClass: string }>;
        systemPromptInstruction?: string;
      };

      const rules = [
        ...(entities ?? []).flatMap((name) => {
          const p = ENTITY_PATTERNS[name];
          return p ? [p] : [];
        }),
        ...(customPatterns ?? []),
      ];

      const accumulated: Record<string, { original: string; entityClass: string }> = {
        ...(inputTokenMap ?? {}),
      };

      const processText = (text: string): string => {
        const { anonymized, tokenMap: newTokens } = anonymizeText({ text, rules, salt });
        for (const [token, entry] of newTokens) {
          accumulated[token] = entry;
        }
        return anonymized;
      };

      if (typeof input === 'string') {
        return {
          output: {
            output: processText(input),
            tokenMap: accumulated,
            systemPromptInstruction,
          },
        };
      }

      const anonymizedMessages = (input as unknown[]).map((msg) =>
        anonymizeMessageContent(msg, processText)
      );
      return {
        output: {
          output: anonymizedMessages,
          tokenMap: accumulated,
          systemPromptInstruction,
        },
      };
    },
  });

function anonymizeMessageContent(message: unknown, processText: (s: string) => string): unknown {
  if (!message || typeof message !== 'object') return message;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content === 'string') {
    return { ...msg, content: processText(content) };
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
            text: processText((part as Record<string, unknown>).text as string),
          };
        }
        return part;
      }),
    };
  }
  return message;
}
