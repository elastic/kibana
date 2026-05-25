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
import {
  ANONYMIZATION_CONTEXT_CAPABILITY_KEY,
  type AnonymizationContextHandle,
} from '../../../anonymization/context_handle';

const inputSchema = z.object({
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Anonymized text or messages array containing PII tokens to restore'),
});

const outputSchema = z.object({
  output: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Deanonymized text or messages with tokens replaced by original values'),
});

/**
 * Creates the transform.pii_restore step definition.
 * The tokenMap is accessed via handlerContext.capabilities — it never appears
 * in the YAML workflow event.
 */
export const createTransformPiiRestoreStepDefinition = () =>
  createServerStepDefinition({
    id: 'transform.pii_restore',
    label: 'Restore PII Tokens',
    description:
      'Replaces anonymization tokens in text or message arrays with their original values. ' +
      'The token map is accessed via the AnonymizationContext capability — it never appears ' +
      'in the YAML workflow event.',
    category: StepCategory.Data,
    inputSchema,
    outputSchema,
    handler: async (handlerCtx) => {
      const { input } = handlerCtx.input as { input: string | unknown[] };
      const ctx = handlerCtx.capabilities?.[ANONYMIZATION_CONTEXT_CAPABILITY_KEY] as
        | AnonymizationContextHandle
        | undefined;
      if (!ctx) {
        throw new Error(
          '[transform.pii_restore] No AnonymizationContext found in handlerContext.capabilities. ' +
            'Ensure the hook was invoked with the anonymizationContext capability.'
        );
      }

      if (typeof input === 'string') {
        return { output: { output: restoreTokens(input, ctx.tokenMap) } };
      }

      const restoredMessages = (input as unknown[]).map((msg) =>
        restoreMessageContent(msg, ctx.tokenMap)
      );
      return { output: { output: restoredMessages } };
    },
  });

function restoreMessageContent(
  message: unknown,
  tokenMap: Map<string, { original: string; entityClass: string }>
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
