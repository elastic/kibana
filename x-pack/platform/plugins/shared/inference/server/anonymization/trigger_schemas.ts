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

/**
 * Event schema for the `inference.beforeCompletion` trigger.
 * Workflows subscribed to this trigger receive the prompt before it is sent to the LLM.
 */
export const BeforeCompletionEventSchema = z
  .object({
    sessionId: z.string().describe('Session/conversation identifier for cross-turn determinism'),
    system: z.string().optional().describe('System prompt, if any'),
    messages: z.array(MessageSchema).describe('Chat messages to be sent to the LLM'),
  })
  .passthrough();

/**
 * Output schema for the `inference.beforeCompletion` trigger.
 * The hook chain must return a (possibly modified) system prompt and messages.
 */
export const BeforeCompletionOutputSchema = z
  .object({
    // nullish() (not just optional()) because LiquidJS evalValueSync returns null (not undefined)
    // for a path like `steps.anonymize_system.output.output` when that step was skipped.
    system: z.string().nullish().describe('Potentially anonymized system prompt'),
    messages: z.array(MessageSchema).describe('Potentially anonymized messages'),
    // Optional override for the [Anonymization context] system-prompt instruction.
    // Set via systemPromptInstruction on the ai.pii step and echoed through emit_output.
    // When present, replaces the auto-generated instruction in invoke_before_completion.ts.
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
