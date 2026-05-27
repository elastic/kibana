/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Schema for a single chat message (minimal shape for the hook payload).
 * Intentionally permissive to avoid coupling to specific message variants.
 */
export const MessageSchema = z
  .object({
    role: z.string().describe('Message role (user, assistant, tool, system)'),
    content: z.string().optional().describe('Text content of the message'),
  })
  .passthrough();

const TokenEntrySchema = z.object({
  original: z.string(),
  entityClass: z.string(),
});

/** Plain-object token map as it flows through YAML event/output data. */
export const TokenMapSchema = z.record(z.string(), TokenEntrySchema);

/**
 * Event schema for the `inference.beforeCompletion` trigger.
 * Workflows subscribed to this trigger receive the prompt before it is sent to the LLM.
 */
export const BeforeCompletionEventSchema = z
  .object({
    sessionId: z.string().describe('Session/conversation identifier for cross-turn determinism'),
    salt: z.string().describe('Per-session salt for deterministic token generation'),
    system: z.string().optional().describe('System prompt, if any'),
    messages: z.array(MessageSchema).describe('Chat messages to be sent to the LLM'),
  })
  .passthrough();

/**
 * Output schema for the `inference.beforeCompletion` trigger.
 * The hook chain must return a (possibly modified) system prompt, messages, and tokenMap.
 */
export const BeforeCompletionOutputSchema = z
  .object({
    // nullish() (not just optional()) because LiquidJS evalValueSync returns null (not undefined)
    // for a path like `steps.anonymize_system.output.output` when that step was skipped.
    system: z.string().nullish().describe('Potentially anonymized system prompt'),
    messages: z.array(MessageSchema).describe('Potentially anonymized messages'),
    tokenMap: TokenMapSchema.describe('Merged token map from all ai.pii steps in this run'),
    // Optional override for the [Anonymization context] system-prompt instruction.
    systemPromptInstruction: z.string().optional(),
  })
  .passthrough();

/**
 * Event schema for the `inference.afterCompletion` trigger.
 */
export const AfterCompletionEventSchema = z
  .object({
    sessionId: z.string().describe('Session/conversation identifier'),
    response: z.string().describe('LLM response text to be deanonymized'),
    tokenMap: TokenMapSchema.describe('Token map produced by the beforeCompletion workflow run'),
  })
  .passthrough();

/**
 * Output schema for the `inference.afterCompletion` trigger.
 */
export const AfterCompletionOutputSchema = z
  .object({
    response: z.string().describe('Deanonymized response text'),
  })
  .passthrough();
