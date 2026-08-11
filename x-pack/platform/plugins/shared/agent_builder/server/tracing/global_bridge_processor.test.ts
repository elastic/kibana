/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { GlobalBridgeProcessor } from './global_bridge_processor';

describe('GlobalBridgeProcessor', () => {
  let mockGlobalProcessor: tracing.SpanProcessor;

  beforeEach(() => {
    mockGlobalProcessor = {
      onStart: jest.fn(),
      onEnd: jest.fn(),
      forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    };
  });

  it('delegates onStart to the global processor', () => {
    const bridge = new GlobalBridgeProcessor(mockGlobalProcessor);
    const mockSpan = {} as tracing.Span;
    const ctx = context.active();

    bridge.onStart(mockSpan, ctx);

    expect(mockGlobalProcessor.onStart).toHaveBeenCalledWith(mockSpan, ctx);
  });

  it('delegates onEnd to the global processor', () => {
    const bridge = new GlobalBridgeProcessor(mockGlobalProcessor);
    const mockSpan = {} as tracing.ReadableSpan;

    bridge.onEnd(mockSpan);

    expect(mockGlobalProcessor.onEnd).toHaveBeenCalledWith(mockSpan);
  });

  it('delegates forceFlush to the global processor', async () => {
    const bridge = new GlobalBridgeProcessor(mockGlobalProcessor);

    await bridge.forceFlush();

    expect(mockGlobalProcessor.forceFlush).toHaveBeenCalledTimes(1);
  });

  it('does not shut down the global processor on shutdown', async () => {
    const bridge = new GlobalBridgeProcessor(mockGlobalProcessor);

    await bridge.shutdown();

    expect(mockGlobalProcessor.shutdown).not.toHaveBeenCalled();
  });
});
