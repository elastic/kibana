/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes } from '@opentelemetry/api';
import { context, propagation, TraceFlags } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { resources, tracing as elasticTracing } from '@elastic/opentelemetry-node/sdk';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from '@kbn/inference-tracing';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';

const SHOULD_TRACK_ATTR = '_agent_builder_should_track';

const emptyResource = resources.resourceFromAttributes({});

describe('AgentBuilderSpanProcessor', () => {
  let contextManager: AsyncLocalStorageContextManager;
  const mockBatch: tracing.SpanProcessor = {
    onStart: jest.fn(),
    onEnd: jest.fn(),
    forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();

    jest
      .spyOn(elasticTracing, 'BatchSpanProcessor')
      .mockReturnValue(mockBatch as elasticTracing.BatchSpanProcessor);

    (mockBatch.onStart as jest.Mock).mockClear();
    (mockBatch.onEnd as jest.Mock).mockClear();
    (mockBatch.forceFlush as jest.Mock).mockClear();
    (mockBatch.shutdown as jest.Mock).mockClear();
    (mockBatch.forceFlush as jest.Mock<Promise<void>, []>).mockResolvedValue(undefined);
    (mockBatch.shutdown as jest.Mock<Promise<void>, []>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    contextManager.disable();
  });

  function inferenceParentContext(): ReturnType<typeof context.active> {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });
    return propagation.setBaggage(context.active(), baggage);
  }

  function createMockSpan(scopeName: string): tracing.Span {
    const spanCtx = {
      traceId: 't'.repeat(32),
      spanId: 's'.repeat(16),
      traceFlags: TraceFlags.NONE,
    };
    const span: tracing.Span & tracing.ReadableSpan = {
      name: 'test',
      kind: 0,
      startTime: [0, 0],
      endTime: [0, 0],
      status: { code: 0 },
      resource: emptyResource,
      instrumentationScope: { name: scopeName },
      duration: [0, 0],
      ended: true,
      events: [],
      links: [],
      parentSpanContext: undefined,
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
      attributes: {},
      spanContext: jest.fn().mockReturnValue(spanCtx),
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      addEvent: jest.fn(),
      addLink: jest.fn(),
      addLinks: jest.fn(),
      setStatus: jest.fn(),
      updateName: jest.fn(),
      end: jest.fn(),
      isRecording: jest.fn().mockReturnValue(true),
      recordException: jest.fn(),
    };
    return span;
  }

  function createMockReadableSpan(attrs: Attributes): tracing.ReadableSpan {
    const readable: tracing.ReadableSpan = {
      name: 'test-span',
      kind: 0,
      startTime: [0, 0],
      endTime: [0, 0],
      status: { code: 0 },
      resource: emptyResource,
      instrumentationScope: { name: 'test' },
      duration: [0, 0],
      ended: true,
      events: [],
      links: [],
      parentSpanContext: undefined,
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
      attributes: attrs,
      spanContext: () => ({
        traceId: 't'.repeat(32),
        spanId: 's'.repeat(16),
        traceFlags: TraceFlags.NONE,
      }),
    };
    return readable;
  }

  function createExporter(): tracing.SpanExporter {
    return {
      export: jest.fn(),
      shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    };
  }

  it('onStart marks inference spans with attribute when enabled', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      isEnabled: () => true,
    });

    const span = createMockSpan('inference');
    const parentContext = inferenceParentContext();
    await processor.onStart(span, parentContext);

    expect(span.setAttribute).toHaveBeenCalledWith(SHOULD_TRACK_ATTR, true);
    expect(mockBatch.onStart).toHaveBeenCalledWith(span, parentContext);
  });

  it('onStart skips non-inference spans', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('http');
    await processor.onStart(span, context.active());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart skips when isEnabled returns false', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      isEnabled: () => false,
    });

    const span = createMockSpan('inference');
    await processor.onStart(span, inferenceParentContext());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onEnd skips spans without the tracking attribute', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const readable = createMockReadableSpan({});
    processor.onEnd(readable);

    expect(mockBatch.onEnd).not.toHaveBeenCalled();
  });

  it('onEnd creates a copy with SAMPLED flag and data_stream.dataset on resource', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const readable = createMockReadableSpan({
      [SHOULD_TRACK_ATTR]: true,
      existing: 'keep-me',
    });

    processor.onEnd(readable);

    expect(mockBatch.onEnd).toHaveBeenCalledTimes(1);
    const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
    expect(exported.attributes).toEqual({ existing: 'keep-me' });
    expect(exported.resource.attributes['data_stream.dataset']).toBe('agent_builder');
    expect(exported.spanContext().traceFlags).toBe(TraceFlags.SAMPLED);
    expect(SHOULD_TRACK_ATTR in exported.attributes).toBe(false);
  });

  it('onEnd preserves span events without modifying their attributes', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const readable: tracing.ReadableSpan = {
      ...createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
      }),
      events: [
        { name: 'gen_ai.system.message', time: [0, 0], attributes: { role: 'system' } },
        { name: 'gen_ai.choice', time: [0, 0], attributes: { finish_reason: 'stop' } },
      ],
    };

    processor.onEnd(readable);

    const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
    expect(exported.events).toHaveLength(2);
    expect(exported.events[0].attributes).toEqual({ role: 'system' });
    expect(exported.events[1].attributes).toEqual({ finish_reason: 'stop' });
  });

  it('forceFlush delegates to batch processor', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    await processor.forceFlush();

    expect(mockBatch.forceFlush).toHaveBeenCalledTimes(1);
  });

  it('shutdown delegates to batch processor', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    await processor.shutdown();

    expect(mockBatch.shutdown).toHaveBeenCalledTimes(1);
  });
});
