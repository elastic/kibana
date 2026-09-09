/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  TimelineEventType,
  ConversationRoundStepType,
  CONVERSATION_EVENT_ID_DELIMITER,
  RESERVED_CONVERSATION_EVENT_TYPES,
} from '@kbn/agent-builder-common';
import { createConversationEventsService } from './conversation_events_service';

describe('createConversationEventsService', () => {
  describe('setup', () => {
    it('registers all built-in event types on setup', () => {
      const service = createConversationEventsService();
      service.setup();

      const start = service.start();
      const registered = new Set(start.list().map((d) => d.type));

      for (const type of Object.values(TimelineEventType)) {
        expect(registered).toContain(type);
      }
    });

    it('drift guard: every TimelineEventType value has a registered definition', () => {
      const service = createConversationEventsService();
      service.setup();
      const start = service.start();

      for (const type of Object.values(TimelineEventType)) {
        expect(start.getDefinition(type)).toBeDefined();
      }
    });

    it('built-in types satisfy the id-delimiter and reserved-name rules', () => {
      for (const type of Object.values(TimelineEventType)) {
        expect(type).not.toContain(CONVERSATION_EVENT_ID_DELIMITER);
        expect(RESERVED_CONVERSATION_EVENT_TYPES as readonly string[]).not.toContain(type);
      }
    });

    it('exposes a register function that adds custom event types', () => {
      const service = createConversationEventsService();
      const setup = service.setup();

      setup.register({
        type: 'test.custom',
        payloadSchema: z.object({ value: z.string() }),
      });

      const start = service.start();
      expect(start.getDefinition('test.custom')).toBeDefined();
    });

    it('throws when registering a custom type that duplicates a built-in', () => {
      const service = createConversationEventsService();
      const setup = service.setup();

      expect(() =>
        setup.register({
          type: TimelineEventType.userMessage,
          payloadSchema: z.object({}),
        })
      ).toThrow(`"${TimelineEventType.userMessage}" already registered`);
    });
  });

  describe('start', () => {
    it('getDefinition returns undefined for an unregistered type', () => {
      const service = createConversationEventsService();
      service.setup();
      const start = service.start();

      expect(start.getDefinition('nonexistent')).toBeUndefined();
    });

    it('list returns the built-in definitions and any registered after', () => {
      const service = createConversationEventsService();
      const setup = service.setup();

      setup.register({
        type: 'test.extra',
        payloadSchema: z.object({ x: z.number() }),
      });

      const start = service.start();
      const types = start.list().map((d) => d.type);

      // All built-ins present
      for (const type of Object.values(TimelineEventType)) {
        expect(types).toContain(type);
      }
      // Custom type also present
      expect(types).toContain('test.extra');
    });
  });

  describe('payload schemas', () => {
    it('user_message schema accepts a valid payload', () => {
      const service = createConversationEventsService();
      service.setup();
      const def = service.start().getDefinition(TimelineEventType.userMessage)!;

      const result = def.payloadSchema.safeParse({ message: 'hello' });
      expect(result.success).toBe(true);
    });

    it('execution_started schema accepts a valid payload', () => {
      const service = createConversationEventsService();
      service.setup();
      const def = service.start().getDefinition(TimelineEventType.executionStarted)!;

      const result = def.payloadSchema.safeParse({ trigger_type: 'user_message' });
      expect(result.success).toBe(true);
    });

    it('execution_started schema rejects an unknown trigger_type', () => {
      const service = createConversationEventsService();
      service.setup();
      const def = service.start().getDefinition(TimelineEventType.executionStarted)!;

      const result = def.payloadSchema.safeParse({ trigger_type: 'not_a_real_trigger' });
      expect(result.success).toBe(false);
    });

    it('execution_step schema accepts a valid tool_call step', () => {
      const service = createConversationEventsService();
      service.setup();
      const def = service.start().getDefinition(TimelineEventType.executionStep)!;

      expect(
        def.payloadSchema.safeParse({
          sequence: 0,
          step: {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'tc1',
            tool_id: 'my_tool',
            params: { query: 'hello' },
            results: [],
          },
        }).success
      ).toBe(true);

      // Invalid: missing sequence
      expect(
        def.payloadSchema.safeParse({
          step: { type: ConversationRoundStepType.reasoning, reasoning: 'thinking' },
        }).success
      ).toBe(false);

      // Invalid: unknown step type
      expect(
        def.payloadSchema.safeParse({ sequence: 0, step: { type: 'not_a_step' } }).success
      ).toBe(false);
    });

    it('execution_terminated schema validates required fields', () => {
      const service = createConversationEventsService();
      service.setup();
      const def = service.start().getDefinition(TimelineEventType.executionTerminated)!;

      const validPayload = {
        time_to_first_token: 120,
        time_to_last_token: 980,
        model_usage: { connector_id: 'c1', llm_calls: 2, input_tokens: 500, output_tokens: 200 },
        outcome: { type: 'responded', response: { message: 'done' } },
      };
      expect(def.payloadSchema.safeParse(validPayload).success).toBe(true);

      // Missing required field (model_usage)
      const { model_usage: _, ...missingModelUsage } = validPayload;
      expect(def.payloadSchema.safeParse(missingModelUsage).success).toBe(false);

      // Invalid outcome type
      expect(
        def.payloadSchema.safeParse({ ...validPayload, outcome: { type: 'not_an_outcome' } })
          .success
      ).toBe(false);

      // prompt_requested outcome with prompts array
      expect(
        def.payloadSchema.safeParse({
          ...validPayload,
          outcome: {
            type: 'prompt_requested',
            prompts: [{ type: 'confirmation', id: 'p1', title: 'Confirm?' }],
          },
        }).success
      ).toBe(true);
    });
  });
});
