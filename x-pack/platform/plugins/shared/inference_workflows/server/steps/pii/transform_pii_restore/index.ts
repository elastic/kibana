/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { restoreTokens } from './executor';

const TokenEntrySchema = z.object({
  original: z.string(),
  entityClass: z.string(),
});

const TokenMapSchema = z.record(z.string(), TokenEntrySchema);

const inputSchema = z.object({
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Anonymized text or messages array containing PII tokens to restore'),
  tokenMap: TokenMapSchema.describe('Token map produced by ai.pii step(s) in this workflow run'),
});

const outputSchema = z.object({
  output: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Deanonymized text or messages with tokens replaced by original values'),
});

export const createTransformPiiRestoreStepDefinition = () =>
  createServerStepDefinition({
    id: 'transform.pii_restore',
    label: 'Restore PII Tokens',
    requiresCapabilities: [],
    description:
      'Replaces anonymization tokens in text or message arrays with their original values. ' +
      'The token map is passed directly as a step input from the preceding ai.pii step output.',
    category: StepCategory.Data,
    inputSchema,
    outputSchema,
    handler: async (handlerCtx) => {
      const { input, tokenMap } = handlerCtx.input as {
        input: string | unknown[];
        tokenMap: Record<string, { original: string; entityClass: string }>;
      };

      if (typeof input === 'string') {
        return { output: { output: restoreTokens(input, tokenMap) } };
      }

      const restoredMessages = (input as unknown[]).map((msg) =>
        restoreMessageContent(msg, tokenMap)
      );
      return { output: { output: restoredMessages } };
    },
  });

function restoreMessageContent(
  message: unknown,
  tokenMap: Record<string, { original: string; entityClass: string }>
): unknown {
  if (!message || typeof message !== 'object') return message;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content === 'string') {
    return { ...msg, content: restoreTokens(content, tokenMap) };
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
            text: restoreTokens((part as Record<string, unknown>).text as string, tokenMap),
          };
        }
        return part;
      }),
    };
  }
  return message;
}
