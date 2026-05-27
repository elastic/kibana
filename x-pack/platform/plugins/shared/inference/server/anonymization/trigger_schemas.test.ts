/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BeforeCompletionEventSchema,
  BeforeCompletionOutputSchema,
  AfterCompletionEventSchema,
  AfterCompletionOutputSchema,
} from './trigger_schemas';

describe('inference trigger schemas', () => {
  describe('BeforeCompletionEventSchema', () => {
    it('accepts a valid event with system prompt, salt, and messages', () => {
      const result = BeforeCompletionEventSchema.safeParse({
        sessionId: 'session-1',
        salt: 'derived-salt-hex',
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts an event without a system prompt (optional)', () => {
      const result = BeforeCompletionEventSchema.safeParse({
        sessionId: 'session-2',
        salt: 'derived-salt-hex',
        messages: [],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an event missing sessionId', () => {
      const result = BeforeCompletionEventSchema.safeParse({
        salt: 'derived-salt-hex',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects an event missing salt', () => {
      const result = BeforeCompletionEventSchema.safeParse({
        sessionId: 'session-1',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('BeforeCompletionOutputSchema', () => {
    it('accepts valid output with system, messages, and tokenMap', () => {
      const result = BeforeCompletionOutputSchema.safeParse({
        system: 'IP_abc123 connected.',
        messages: [{ role: 'user', content: 'Tell me about IP_abc123' }],
        tokenMap: { ['IP_abc123']: { original: '192.168.1.1', entityClass: 'IP' } },
      });
      expect(result.success).toBe(true);
    });

    it('accepts output with an empty tokenMap (no PII found)', () => {
      const result = BeforeCompletionOutputSchema.safeParse({
        messages: [],
        tokenMap: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe('AfterCompletionEventSchema', () => {
    it('accepts a valid event with tokenMap', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
        response: 'The IP_abc123 address was involved.',
        tokenMap: { ['IP_abc123']: { original: '192.168.1.1', entityClass: 'IP' } },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a valid event with an empty tokenMap', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
        response: 'The IP_abc123 address was involved.',
        tokenMap: {},
      });
      expect(result.success).toBe(true);
    });

    it('rejects an event missing response', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
        tokenMap: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects an event missing tokenMap', () => {
      const result = AfterCompletionEventSchema.safeParse({
        sessionId: 'session-3',
        response: 'The IP_abc123 address was involved.',
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
