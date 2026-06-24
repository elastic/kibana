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
import { GenAISemanticConventions } from '@kbn/inference-tracing';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BUILTIN_AGENTS } from '@kbn/agent-builder-server/allow_lists';
import {
  AgentBuilderSpanProcessor,
  type TracingPrivacySettings,
} from './agent_builder_span_processor';
import {
  AGENT_BUILDER_OWNER_BAGGAGE_KEY,
  AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  DATA_STREAM_NAMESPACE_ATTR,
} from './agent_builder_context';

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

  function agentBuilderParentContext(): ReturnType<typeof context.active> {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
      [AGENT_BUILDER_OWNER_BAGGAGE_KEY]: { value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE },
    });
    return propagation.setBaggage(context.active(), baggage);
  }

  function inferenceOnlyParentContext(): ReturnType<typeof context.active> {
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

  function createSettings(overrides?: Partial<TracingPrivacySettings>): TracingPrivacySettings {
    return {
      enabled: true,
      includeUserPrompts: true,
      includeLlmResponses: true,
      includeSystemPrompt: true,
      includeRealNames: true,
      includeRealIds: true,
      ...overrides,
    };
  }

  it('onStart marks agent builder inference spans with attribute when enabled', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const span = createMockSpan('inference');
    const parentContext = agentBuilderParentContext();
    await processor.onStart(span, parentContext);

    expect(span.setAttribute).toHaveBeenCalledWith(SHOULD_TRACK_ATTR, true);
    expect(mockBatch.onStart).toHaveBeenCalledWith(span, parentContext);
  });

  it('onStart skips inference spans without agent builder baggage', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const span = createMockSpan('inference');
    const parentContext = inferenceOnlyParentContext();
    await processor.onStart(span, parentContext);

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart skips non-inference spans', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const span = createMockSpan('http');
    await processor.onStart(span, context.active());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart skips when enabled is false', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings({ enabled: false }),
    });

    const span = createMockSpan('inference');
    await processor.onStart(span, agentBuilderParentContext());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onEnd skips spans without the tracking attribute', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const readable = createMockReadableSpan({});
    processor.onEnd(readable);

    expect(mockBatch.onEnd).not.toHaveBeenCalled();
  });

  it('onEnd creates a copy with data_stream.dataset and strips tracking attribute', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const readable = createMockReadableSpan({
      [SHOULD_TRACK_ATTR]: true,
      existing: 'keep-me',
    });

    processor.onEnd(readable);

    expect(mockBatch.onEnd).toHaveBeenCalledTimes(1);
    const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
    expect(exported.attributes).toEqual({
      existing: 'keep-me',
    });
    expect(exported.resource.attributes).toEqual(
      expect.objectContaining({ 'data_stream.dataset': 'agent_builder' })
    );
    expect(exported.resource.attributes).not.toHaveProperty(DATA_STREAM_NAMESPACE_ATTR);
    expect(exported.spanContext().traceFlags).toBe(TraceFlags.NONE);
    expect(SHOULD_TRACK_ATTR in exported.attributes).toBe(false);
  });

  it(`onEnd includes ${DATA_STREAM_NAMESPACE_ATTR} in resource when span has the attribute`, () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    const readable = createMockReadableSpan({
      [SHOULD_TRACK_ATTR]: true,
      [DATA_STREAM_NAMESPACE_ATTR]: 'pablo',
      existing: 'keep-me',
    });

    processor.onEnd(readable);

    expect(mockBatch.onEnd).toHaveBeenCalledTimes(1);
    const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
    expect(exported.attributes).toEqual({
      existing: 'keep-me',
    });
    expect(exported.resource.attributes).toEqual(
      expect.objectContaining({
        'data_stream.dataset': 'agent_builder',
        [DATA_STREAM_NAMESPACE_ATTR]: 'pablo',
      })
    );
    expect(DATA_STREAM_NAMESPACE_ATTR in exported.attributes).toBe(false);
  });

  it('onEnd preserves span events without modifying their attributes', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings({ includeSystemPrompt: true, includeLlmResponses: true }),
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
      getSettings: () => createSettings(),
    });

    await processor.forceFlush();

    expect(mockBatch.forceFlush).toHaveBeenCalledTimes(1);
  });

  it('shutdown delegates to batch processor', async () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
      getSettings: () => createSettings(),
    });

    await processor.shutdown();

    expect(mockBatch.shutdown).toHaveBeenCalledTimes(1);
  });

  describe('sensitive attribute hashing', () => {
    it('hashes custom agent IDs but keeps built-in agent IDs', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIAgentId]: 'user-custom-agent-uuid',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).toMatch(/^custom-/);
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).not.toBe(
        'user-custom-agent-uuid'
      );
    });

    it('preserves built-in (default) agent ID without hashing', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIAgentId]: agentBuilderDefaultAgentId,
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).toBe(
        agentBuilderDefaultAgentId
      );
    });

    it('hashes conversation IDs', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIConversationId]: 'conv-uuid-123',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIConversationId]).toMatch(
        /^[a-f0-9]{16}$/
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIConversationId]).not.toBe(
        'conv-uuid-123'
      );
    });

    it('hashes workflow IDs and execution IDs', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        'elastic.workflow.id': 'workflow-uuid-456',
        'elastic.workflow.execution_id': 'exec-uuid-789',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes['elastic.workflow.id']).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes['elastic.workflow.id']).not.toBe('workflow-uuid-456');
      expect(exported.attributes['elastic.workflow.execution_id']).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes['elastic.workflow.execution_id']).not.toBe('exec-uuid-789');
    });

    it('does NOT hash gen_ai.tool.call.id', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIToolCallId]: 'call_abc123',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallId]).toBe('call_abc123');
    });

    it('produces stable hashes for the same input', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealIds: false }),
      });

      const readable1 = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIConversationId]: 'same-id',
      });
      const readable2 = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIConversationId]: 'same-id',
      });

      processor.onEnd(readable1);
      processor.onEnd(readable2);

      const exported1 = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      const exported2 = (mockBatch.onEnd as jest.Mock).mock.calls[1][0] as tracing.ReadableSpan;
      expect(exported1.attributes[GenAISemanticConventions.GenAIConversationId]).toBe(
        exported2.attributes[GenAISemanticConventions.GenAIConversationId]
      );
    });
  });

  describe('name anonymization', () => {
    it('anonymizes custom agent names to "custom"', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: false }),
      });

      const readable: tracing.ReadableSpan = {
        ...createMockReadableSpan({
          [SHOULD_TRACK_ATTR]: true,
          [GenAISemanticConventions.GenAIAgentName]: 'my-custom-agent',
        }),
        name: 'invoke_agent my-custom-agent',
      };

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentName]).toBe('custom');
      expect(exported.name).toBe('invoke_agent custom');
    });

    it('preserves built-in agent names', () => {
      const builtinAgentName = AGENT_BUILDER_BUILTIN_AGENTS[0];
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: false }),
      });

      const readable: tracing.ReadableSpan = {
        ...createMockReadableSpan({
          [SHOULD_TRACK_ATTR]: true,
          [GenAISemanticConventions.GenAIAgentName]: builtinAgentName,
        }),
        name: `invoke_agent ${builtinAgentName}`,
      };

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentName]).toBe(builtinAgentName);
      expect(exported.name).toBe(`invoke_agent ${builtinAgentName}`);
    });

    it('anonymizes workflow names to "custom"', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIWorkflowName]: 'my-secret-workflow',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIWorkflowName]).toBe('custom');
    });

    it('preserves workflow names when includeRealNames is true', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: true }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIWorkflowName]: 'my-workflow',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIWorkflowName]).toBe('my-workflow');
    });

    it('strips tool definitions and description when includeRealNames is false', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: false }),
      });

      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIToolDefinitions]: JSON.stringify([
          { name: 'secret_internal_tool', description: 'Does secret things' },
        ]),
        [GenAISemanticConventions.GenAIToolDescription]: 'My confidential tool description',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(GenAISemanticConventions.GenAIToolDefinitions in exported.attributes).toBe(false);
      expect(GenAISemanticConventions.GenAIToolDescription in exported.attributes).toBe(false);
    });

    it('preserves tool definitions and description when includeRealNames is true', () => {
      const processor = new AgentBuilderSpanProcessor({
        exporter: createExporter(),
        scheduledDelayMillis: 1,
        getSettings: () => createSettings({ includeRealNames: true }),
      });

      const definitions = JSON.stringify([{ name: 'my_tool', description: 'Does things' }]);
      const readable = createMockReadableSpan({
        [SHOULD_TRACK_ATTR]: true,
        [GenAISemanticConventions.GenAIToolDefinitions]: definitions,
        [GenAISemanticConventions.GenAIToolDescription]: 'My tool description',
      });

      processor.onEnd(readable);

      const exported = (mockBatch.onEnd as jest.Mock).mock.calls[0][0] as tracing.ReadableSpan;
      expect(exported.attributes[GenAISemanticConventions.GenAIToolDefinitions]).toBe(definitions);
      expect(exported.attributes[GenAISemanticConventions.GenAIToolDescription]).toBe(
        'My tool description'
      );
    });
  });
});
