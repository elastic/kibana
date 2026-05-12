/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BeforePromptSendEventSchema,
  BeforePromptSendOutputSchema,
  AfterCompletionEventSchema,
  AfterCompletionOutputSchema,
} from './trigger_schemas';

describe('inference trigger schemas', () => {
  describe('BeforePromptSendEventSchema', () => {
    it('accepts a valid event with system prompt and messages', () => {
      const result = BeforePromptSendEventSchema.safeParse({
        sessionId: 'session-1',
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts an event without a system prompt (optional)', () => {
      const result = BeforePromptSendEventSchema.safeParse({
        sessionId: 'session-2',
        messages: [],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an event missing sessionId', () => {
      const result = BeforePromptSendEventSchema.safeParse({
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('BeforePromptSendOutputSchema', () => {
    it('accepts valid output with system and messages', () => {
      const result = BeforePromptSendOutputSchema.safeParse({
        system: 'IP_abc123 connected.',
        messages: [{ role: 'user', content: 'Tell me about IP_abc123' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts output without system (pass-through when no system prompt)', () => {
      const result = BeforePromptSendOutputSchema.safeParse({
        messages: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('AfterCompletionEventSchema', () => {
    it('accepts a valid event', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
        response: 'The IP_abc123 address was involved.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an event missing response', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AfterCompletionOutputSchema', () => {
    it('accepts valid output with deanonymized response', () => {
      const result = AfterCompletionOutputSchema.safeParse({
        response: 'The 192.168.1.1 address was involved.',
      });
      expect(result.success).toBe(true);
    });
  });
});
