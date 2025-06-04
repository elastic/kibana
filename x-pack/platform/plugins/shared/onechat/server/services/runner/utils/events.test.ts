/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolEventEmitter, createAgentEventEmitter, convertInternalEvent } from './events';
import type { InternalRunEvent, RunContext } from '@kbn/onechat-server';
import { ChatAgentEventType, type MessageChunkEvent } from '@kbn/onechat-common/agents';

describe('Event utilities', () => {
  describe('createEventEmitter', () => {
    it('should emit events with context metadata', () => {
      const mockEventHandler = jest.fn();
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createToolEventEmitter({
        eventHandler: mockEventHandler,
        context,
      });

      const testEvent: InternalRunEvent = {
        type: 'test-event',
        data: { foo: 'bar' },
        meta: { baz: 'qux' },
      };

      emitter.emit(testEvent);

      expect(mockEventHandler).toHaveBeenCalledWith({
        type: 'test-event',
        data: { foo: 'bar' },
        meta: {
          baz: 'qux',
          runId: 'test-run-id',
          stack: [],
        },
      });
    });

    it('should handle events without meta data', () => {
      const mockEventHandler = jest.fn();
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createToolEventEmitter({
        eventHandler: mockEventHandler,
        context,
      });

      const testEvent: InternalRunEvent = {
        type: 'test-event',
        data: { foo: 'bar' },
      };

      emitter.emit(testEvent);

      expect(mockEventHandler).toHaveBeenCalledWith({
        type: 'test-event',
        data: { foo: 'bar' },
        meta: {
          runId: 'test-run-id',
          stack: [],
        },
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
          messageId: 'test-message-id',
          textChunk: 'test message',
        },
        meta: { runId: 'test-run-id' },
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
          messageId: 'test-message-id',
          textChunk: 'test message',
        },
        meta: { runId: 'test-run-id' },
      };

      // This should not throw
      emitter.emit(testEvent);
    });
  });

  describe('convertInternalEvent', () => {
    it('should convert internal event to public event with context', () => {
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const internalEvent: InternalRunEvent = {
        type: 'test-event',
        data: { foo: 'bar' },
        meta: { baz: 'qux' },
      };

      const publicEvent = convertInternalEvent({
        event: internalEvent,
        context,
      });

      expect(publicEvent).toEqual({
        type: 'test-event',
        data: { foo: 'bar' },
        meta: {
          baz: 'qux',
          runId: 'test-run-id',
          stack: [],
        },
      });
    });

    it('should handle events without meta data', () => {
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const internalEvent: InternalRunEvent = {
        type: 'test-event',
        data: { foo: 'bar' },
      };

      const publicEvent = convertInternalEvent({
        event: internalEvent,
        context,
      });

      expect(publicEvent).toEqual({
        type: 'test-event',
        data: { foo: 'bar' },
        meta: {
          runId: 'test-run-id',
          stack: [],
        },
      });
    });
  });
});
