/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace } from '@opentelemetry/api';
import {
  initInferenceTracerProvider,
  getInferenceTracer,
  shutdownInferenceTracerProvider,
} from './inference_tracer_provider';
import { AlwaysOnSampler, TracerProvider } from '@opentelemetry/sdk-trace';
import type { SpanProcessor } from '@opentelemetry/sdk-trace';
import { defaultResource } from '@opentelemetry/resources';

const mockTracerProvider = {
  getTracer: jest.fn().mockReturnValue({ startActiveSpan: jest.fn() }),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@opentelemetry/sdk-trace', () => ({
  ...jest.requireActual('@opentelemetry/sdk-trace'),
  TracerProvider: jest.fn(() => mockTracerProvider),
}));

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
      const mockProcessor: SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: defaultResource(),
      });

      const tracer = getInferenceTracer();
      expect(mockTracerProvider.getTracer).toHaveBeenCalledWith('inference');
      expect(tracer).toBe(mockTracerProvider.getTracer.mock.results[0].value);
    });
  });

  describe('initInferenceTracerProvider', () => {
    it('creates a TracerProvider with AlwaysOnSampler', () => {
      const mockProcessor: SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      const resource = defaultResource();

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource,
      });

      expect(TracerProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          sampler: expect.any(AlwaysOnSampler),
          spanProcessors: [mockProcessor],
          resource,
        })
      );
    });
  });

  describe('shutdownInferenceTracerProvider', () => {
    it('calls shutdown on the provider', async () => {
      const mockProcessor: SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: defaultResource(),
      });

      await shutdownInferenceTracerProvider();

      expect(mockTracerProvider.shutdown).toHaveBeenCalledTimes(1);
    });

    it('falls back to global tracer after shutdown', async () => {
      const mockProcessor: SpanProcessor = {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };

      initInferenceTracerProvider({
        processors: [mockProcessor],
        resource: defaultResource(),
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
