/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { node, tracing, resources } from '@elastic/opentelemetry-node/sdk';
import { trace } from '@opentelemetry/api';
import {
  initInferenceTracerProvider,
  getInferenceTracer,
  shutdownInferenceTracerProvider,
} from './inference_tracer_provider';

const mockNodeTracerProvider = {
  getTracer: jest.fn().mockReturnValue({ startActiveSpan: jest.fn() }),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

jest
  .spyOn(node, 'NodeTracerProvider')
  .mockReturnValue(mockNodeTracerProvider as unknown as node.NodeTracerProvider);

describe('inference_tracer_provider', () => {
  afterEach(async () => {
    await shutdownInferenceTracerProvider();
    jest.clearAllMocks();
  });

  describe('getInferenceTracer', () => {
    it('falls back to global tracer before init', () => {
      const tracer = getInferenceTracer();
      expect(tracer).toStrictEqual(trace.getTracer('inference'));
    });

    it('returns the inference provider tracer after init', () => {
      const mockProcessor: tracing.SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: resources.defaultResource(),
      });

      const tracer = getInferenceTracer();
      expect(mockNodeTracerProvider.getTracer).toHaveBeenCalledWith('inference');
      expect(tracer).toBe(mockNodeTracerProvider.getTracer.mock.results[0].value);
    });
  });

  describe('initInferenceTracerProvider', () => {
    it('creates a NodeTracerProvider with AlwaysOnSampler', () => {
      const mockProcessor: tracing.SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      const resource = resources.defaultResource();

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource,
      });

      expect(node.NodeTracerProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          sampler: expect.any(tracing.AlwaysOnSampler),
          spanProcessors: [mockProcessor],
          resource,
        })
      );
    });
  });

  describe('shutdownInferenceTracerProvider', () => {
    it('calls shutdown on the provider', async () => {
      const mockProcessor: tracing.SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: resources.defaultResource(),
      });

      await shutdownInferenceTracerProvider();

      expect(mockNodeTracerProvider.shutdown).toHaveBeenCalledTimes(1);
    });

    it('falls back to global tracer after shutdown', async () => {
      const mockProcessor: tracing.SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: resources.defaultResource(),
      });

      await shutdownInferenceTracerProvider();

      const tracer = getInferenceTracer();
      expect(tracer).toStrictEqual(trace.getTracer('inference'));
    });

    it('is safe to call when not initialized', async () => {
      await expect(shutdownInferenceTracerProvider()).resolves.not.toThrow();
    });
  });
});
