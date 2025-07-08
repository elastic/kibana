/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolEventEmitter, createAgentEventEmitter } from './events';
import type { InternalToolEvent, RunContext } from '@kbn/onechat-server';
import { ChatAgentEventType, type MessageChunkEvent } from '@kbn/onechat-common/agents';

describe('Event utilities', () => {
  describe('createToolEventEmitter', () => {
    it('should emit events ', () => {
      const mockEventHandler = jest.fn();
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createToolEventEmitter({
        eventHandler: mockEventHandler,
        context,
      });

      const testEvent: InternalToolEvent = {
        type: 'test-event',
        data: { foo: 'bar' },
      };

      emitter.emit(testEvent);

      expect(mockEventHandler).toHaveBeenCalledWith({
        type: 'test-event',
        data: { foo: 'bar' },
      });
    });
  });

  describe('createAgentEventEmitter', () => {
    it('should emit events directly to the event handler when provided', () => {
      const mockEventHandler = jest.fn();
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createAgentEventEmitter({
        eventHandler: mockEventHandler,
        context,
      });

      const testEvent: MessageChunkEvent = {
        type: ChatAgentEventType.messageChunk,
        data: {
          message_id: 'test-message-id',
          text_chunk: 'test message',
        },
      };

      emitter.emit(testEvent);

      expect(mockEventHandler).toHaveBeenCalledWith(testEvent);
    });

    it('should create a noop emitter when no event handler is provided', () => {
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createAgentEventEmitter({
        eventHandler: undefined,
        context,
      });

      const testEvent: MessageChunkEvent = {
        type: ChatAgentEventType.messageChunk,
        data: {
          message_id: 'test-message-id',
          text_chunk: 'test message',
        },
      };

      // This should not throw
      emitter.emit(testEvent);
    });
  });
});
