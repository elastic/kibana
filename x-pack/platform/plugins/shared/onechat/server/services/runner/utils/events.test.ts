/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventEmitter, createNoopEventEmitter, convertInternalEvent } from './events';
import type { InternalRunEvent, RunContext } from '@kbn/onechat-server';

describe('Event utilities', () => {
  describe('createEventEmitter', () => {
    it('should emit events with context metadata', () => {
      const mockEventHandler = jest.fn();
      const context: RunContext = {
        runId: 'test-run-id',
        stack: [],
      };

      const emitter = createEventEmitter({
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

      const emitter = createEventEmitter({
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

  describe('createNoopEventEmitter', () => {
    it('should create an emitter that does nothing', () => {
      const emitter = createNoopEventEmitter();
      // This should not throw
      emitter.emit({ type: 'test-event', data: {} });
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
