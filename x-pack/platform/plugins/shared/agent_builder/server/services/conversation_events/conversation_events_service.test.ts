/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  TimelineEventType,
  CONVERSATION_EVENT_ID_DELIMITER,
  RESERVED_CONVERSATION_EVENT_TYPES,
} from '@kbn/agent-builder-common';
import { createConversationEventsService } from './conversation_events_service';

describe('createConversationEventsService', () => {
  describe('setup', () => {
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

    it('throws when registering a custom type that matches a built-in name', () => {
      const service = createConversationEventsService();
      const setup = service.setup();

      expect(() =>
        setup.register({
          type: TimelineEventType.userMessage,
          payloadSchema: z.object({}),
        })
      ).toThrow(/is a built-in timeline event type/);
    });
  });

  describe('start', () => {
    it('getDefinition returns undefined for an unregistered type', () => {
      const service = createConversationEventsService();
      service.setup();
      const start = service.start();

      expect(start.getDefinition('nonexistent')).toBeUndefined();
    });

    it('list returns only types that were explicitly registered', () => {
      const service = createConversationEventsService();
      const setup = service.setup();

      setup.register({
        type: 'test.extra',
        payloadSchema: z.object({ x: z.number() }),
      });

      const start = service.start();
      const types = start.list().map((d) => d.type);

      expect(types).toEqual(['test.extra']);
    });
  });
});
