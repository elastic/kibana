/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolEventEmitter, createAgentEventEmitter } from './events';
import type { RunContext } from '@kbn/agent-builder-server';
import { ChatEventType, type MessageChunkEvent } from '@kbn/agent-builder-common';

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

      emitter.reportProgress('progress');

      expect(mockEventHandler).toHaveBeenCalledWith({
        type: ChatEventType.toolProgress,
        data: { message: 'progress' },
      });
    });
  });

  describe('emitBrowserToolCall', () => {
    it('emitBrowserToolCall forwards a browser_tool_call event with client_id, issued_at and expires_at', () => {
      const mockEventHandler = jest.fn();
      const emitter = createToolEventEmitter({
        eventHandler: mockEventHandler,
        context: { runId: 'test-run-id', stack: [] },
      });

      emitter.emitBrowserToolCall({
        params: { foo: 'bar' },
        clientId: 'client-1',
        issuedAt: '2025-12-31T23:59:30.000Z',
        expiresAt: '2026-01-01T00:00:00.000Z',
      });

      expect(mockEventHandler).toHaveBeenCalledWith({
        type: ChatEventType.browserToolCall,
        data: {
          params: { foo: 'bar' },
          client_id: 'client-1',
          issued_at: '2025-12-31T23:59:30.000Z',
          expires_at: '2026-01-01T00:00:00.000Z',
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
        type: ChatEventType.messageChunk,
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
        type: ChatEventType.messageChunk,
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
