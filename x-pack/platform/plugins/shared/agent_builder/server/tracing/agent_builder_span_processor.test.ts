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
import {
  BAGGAGE_TRACKING_BEACON_KEY,
  BAGGAGE_TRACKING_BEACON_VALUE,
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  UserAttributes,
  WORKFLOW_RUN_ID_ATTRIBUTE_NAME,
} from '@kbn/inference-tracing';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  AGENT_BUILDER_BUILTIN_AGENTS,
  AGENT_BUILDER_BUILTIN_TOOLS,
} from '@kbn/agent-builder-server/allow_lists';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import type { TracingPrivacySettings } from './privacy_settings';
import {
  AGENT_BUILDER_OWNER_BAGGAGE_KEY,
  AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  DATA_STREAM_NAMESPACE_ATTR,
  SPACE_ID_BAGGAGE_KEY,
  setPrivacySettingsOnContext,
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

  function createSettings(overrides?: Partial<TracingPrivacySettings>): TracingPrivacySettings {
    return {
      enabled: true,
      includeUserPrompts: true,
      includeLlmResponses: true,
      includeToolDetails: true,
      includeSystemPrompt: true,
      includeRealNames: true,
      includeRealIds: true,
      includeUserData: true,
      ...overrides,
    };
  }

  function agentBuilderParentContext(
    spaceId?: string,
    settings: TracingPrivacySettings = createSettings()
  ): ReturnType<typeof context.active> {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
      [AGENT_BUILDER_OWNER_BAGGAGE_KEY]: { value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE },
      ...(spaceId ? { [SPACE_ID_BAGGAGE_KEY]: { value: spaceId } } : {}),
    });
    return setPrivacySettingsOnContext(propagation.setBaggage(context.active(), baggage), settings);
  }

  function inferenceOnlyParentContext(): ReturnType<typeof context.active> {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });
    return propagation.setBaggage(context.active(), baggage);
  }

  function createMockSpan(
    scopeName: string,
    name = 'test-span'
  ): tracing.Span & tracing.ReadableSpan {
    const spanCtx = {
      traceId: 't'.repeat(32),
      spanId: 's'.repeat(16),
      traceFlags: TraceFlags.NONE,
    };
    const attributes: Attributes = {};
    const span: tracing.Span & tracing.ReadableSpan = {
      name,
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
      attributes,
      spanContext: jest.fn().mockReturnValue(spanCtx),
      setAttribute: jest.fn((key: string, value: unknown) => {
        attributes[key] = value as Attributes[string];
        return span;
      }),
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

  function createExporter(): tracing.SpanExporter {
    return {
      export: jest.fn(),
      shutdown: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      forceFlush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    };
  }

  function exportWith(
    settings: Partial<TracingPrivacySettings>,
    attrs: Attributes = {},
    options?: { spaceId?: string; name?: string; events?: tracing.ReadableSpan['events'] }
  ): tracing.ReadableSpan {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });
    const span = createMockSpan('inference', options?.name);
    processor.onStart(span, agentBuilderParentContext(options?.spaceId, createSettings(settings)));
    if (options?.spaceId) {
      span.setAttribute(DATA_STREAM_NAMESPACE_ATTR, options.spaceId);
    }
    Object.assign(span.attributes, attrs);
    if (options?.events) {
      Object.assign(span, { events: options.events });
    }
    processor.onEnd(span);
    const calls = (mockBatch.onEnd as jest.Mock).mock.calls;
    return calls[calls.length - 1][0] as tracing.ReadableSpan;
  }

  it('onStart marks agent builder inference spans with attribute when enabled', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('inference');
    const parentContext = agentBuilderParentContext();
    processor.onStart(span, parentContext);

    expect(span.setAttribute).toHaveBeenCalledWith(SHOULD_TRACK_ATTR, true);
    expect(span.setAttribute).not.toHaveBeenCalledWith(
      DATA_STREAM_NAMESPACE_ATTR,
      expect.anything()
    );
    expect(mockBatch.onStart).toHaveBeenCalledWith(span, parentContext);
  });

  it('onStart skips inference spans without agent builder baggage', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('inference');
    processor.onStart(span, inferenceOnlyParentContext());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart skips without privacy settings on context', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('inference');
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
      [AGENT_BUILDER_OWNER_BAGGAGE_KEY]: { value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE },
    });
    processor.onStart(span, propagation.setBaggage(context.active(), baggage));

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart skips non-inference spans', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('http');
    processor.onStart(span, context.active());

    expect(span.setAttribute).not.toHaveBeenCalled();
    expect(mockBatch.onStart).not.toHaveBeenCalled();
  });

  it('onStart still marks the span when enabled is false', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('inference');
    processor.onStart(
      span,
      agentBuilderParentContext(undefined, createSettings({ enabled: false }))
    );

    expect(span.setAttribute).toHaveBeenCalledWith(SHOULD_TRACK_ATTR, true);
    expect(mockBatch.onStart).toHaveBeenCalled();
  });

  it('onEnd skips a span that was never started', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    processor.onEnd(createMockSpan('inference'));

    expect(mockBatch.onEnd).not.toHaveBeenCalled();
  });

  it('onEnd creates a copy with data_stream.dataset and strips tracking attribute', () => {
    const exported = exportWith({}, { existing: 'keep-me' });

    expect(mockBatch.onEnd).toHaveBeenCalledTimes(1);
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
    const exported = exportWith({}, { existing: 'keep-me' }, { spaceId: 'pablo' });

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
    const exported = exportWith(
      {},
      {},
      {
        events: [
          { name: 'some.event', time: [0, 0], attributes: { key: 'value' } },
          { name: 'another.event', time: [0, 0], attributes: { other: 'data' } },
        ],
      }
    );

    expect(exported.events).toHaveLength(2);
    expect(exported.events[0].attributes).toEqual({ key: 'value' });
    expect(exported.events[1].attributes).toEqual({ other: 'data' });
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

  it('onEnd skips when enabled is false even if span was marked at onStart', () => {
    const processor = new AgentBuilderSpanProcessor({
      exporter: createExporter(),
      scheduledDelayMillis: 1,
    });

    const span = createMockSpan('inference');
    processor.onStart(
      span,
      agentBuilderParentContext(undefined, createSettings({ enabled: false }))
    );
    processor.onEnd(span);

    expect(span.setAttribute).toHaveBeenCalledWith(SHOULD_TRACK_ATTR, true);
    expect(mockBatch.onEnd).not.toHaveBeenCalled();
  });

  describe('message attribute privacy', () => {
    const systemInstructions = JSON.stringify([
      { type: 'text', content: 'You are a helpful assistant' },
    ]);
    const inputMessages = JSON.stringify([
      { role: 'user', parts: [{ type: 'text', content: 'Hello' }] },
      {
        role: 'assistant',
        parts: [
          { type: 'text', content: 'Hi!' },
          { type: 'tool_call', id: 'call_1', name: 'my-secret-tool', arguments: '{}' },
        ],
      },
      {
        role: 'tool',
        parts: [{ type: 'tool_call_response', id: 'call_1', response: '{"ok":true}' }],
      },
    ]);
    const outputMessages = JSON.stringify([
      {
        role: 'assistant',
        finish_reason: 'stop',
        parts: [
          { type: 'text', content: 'Done.' },
          { type: 'tool_call', id: 'call_2', name: 'my-secret-tool', arguments: '{}' },
        ],
      },
    ]);

    function processAndGetExported(
      settings: Partial<TracingPrivacySettings>,
      extraAttrs?: Attributes
    ): tracing.ReadableSpan {
      return exportWith(settings, {
        [GenAISemanticConventions.GenAISystemInstructions]: systemInstructions,
        [GenAISemanticConventions.GenAIInputMessages]: inputMessages,
        [GenAISemanticConventions.GenAIOutputMessages]: outputMessages,
        ...extraAttrs,
      });
    }

    function parseAttr<T>(exported: tracing.ReadableSpan, key: string): T {
      return JSON.parse(exported.attributes[key] as string) as T;
    }

    function allPartTypes(msgs: Array<{ parts: Array<{ type: string }> }>): string[] {
      return msgs.flatMap((m) => m.parts.map((p) => p.type));
    }

    function allToolCallNames(
      msgs: Array<{ parts: Array<{ type: string; name?: string }> }>
    ): string[] {
      return msgs.flatMap((m) => m.parts.filter((p) => p.type === 'tool_call').map((p) => p.name!));
    }

    it('strips gen_ai.system_instructions when includeSystemPrompt is false', () => {
      const exported = processAndGetExported({ includeSystemPrompt: false });

      expect(GenAISemanticConventions.GenAISystemInstructions in exported.attributes).toBe(false);
      expect(exported.attributes[GenAISemanticConventions.GenAIInputMessages]).toBeDefined();
      expect(exported.attributes[GenAISemanticConventions.GenAIOutputMessages]).toBeDefined();
    });

    it('filters user messages from gen_ai.input.messages when includeUserPrompts is false', () => {
      const exported = processAndGetExported({ includeUserPrompts: false });

      const msgs = parseAttr<Array<{ role: string }>>(
        exported,
        GenAISemanticConventions.GenAIInputMessages
      );
      expect(msgs.map((m) => m.role)).toEqual(['assistant', 'tool']);
    });

    it('strips gen_ai.output.messages and assistant messages from input when includeLlmResponses is false', () => {
      const exported = processAndGetExported({ includeLlmResponses: false });

      expect(GenAISemanticConventions.GenAIOutputMessages in exported.attributes).toBe(false);

      const msgs = parseAttr<Array<{ role: string }>>(
        exported,
        GenAISemanticConventions.GenAIInputMessages
      );
      expect(msgs.every((m) => m.role !== 'assistant')).toBe(true);
      expect(msgs.map((m) => m.role)).toEqual(['user', 'tool']);
    });

    it('strips tool messages and tool_call parts from input/output when includeToolDetails is false', () => {
      const exported = processAndGetExported({ includeToolDetails: false });

      const input = parseAttr<Array<{ role: string; parts: Array<{ type: string }> }>>(
        exported,
        GenAISemanticConventions.GenAIInputMessages
      );
      expect(input.every((m) => m.role !== 'tool')).toBe(true);
      expect(allPartTypes(input)).not.toContain('tool_call');

      const output = parseAttr<Array<{ parts: Array<{ type: string }> }>>(
        exported,
        GenAISemanticConventions.GenAIOutputMessages
      );
      expect(allPartTypes(output)).not.toContain('tool_call');
    });

    it('anonymizes custom tool names in message parts when includeRealNames is false', () => {
      const exported = processAndGetExported({ includeRealNames: false });

      const input = parseAttr<Array<{ parts: Array<{ type: string; name?: string }> }>>(
        exported,
        GenAISemanticConventions.GenAIInputMessages
      );
      const output = parseAttr<Array<{ parts: Array<{ type: string; name?: string }> }>>(
        exported,
        GenAISemanticConventions.GenAIOutputMessages
      );
      expect(allToolCallNames(input)).toEqual(['custom']);
      expect(allToolCallNames(output)).toEqual(['custom']);
    });

    it('preserves built-in tool names in message parts when includeRealNames is false', () => {
      const builtinToolName = AGENT_BUILDER_BUILTIN_TOOLS[0];
      const exported = processAndGetExported(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIInputMessages]: JSON.stringify([
            {
              role: 'assistant',
              parts: [{ type: 'tool_call', id: 'call_1', name: builtinToolName, arguments: '{}' }],
            },
          ]),
        }
      );

      const input = parseAttr<Array<{ parts: Array<{ type: string; name?: string }> }>>(
        exported,
        GenAISemanticConventions.GenAIInputMessages
      );
      expect(allToolCallNames(input)).toEqual([builtinToolName]);
    });

    it('preserves all message attributes when all include flags are true', () => {
      const exported = processAndGetExported({});

      expect(exported.attributes[GenAISemanticConventions.GenAISystemInstructions]).toBe(
        systemInstructions
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIInputMessages]).toBe(inputMessages);
      expect(exported.attributes[GenAISemanticConventions.GenAIOutputMessages]).toBe(
        outputMessages
      );
    });
  });

  describe('tool call I/O stripping', () => {
    it('strips tool call arguments and result when includeToolDetails is false', () => {
      const exported = exportWith(
        { includeToolDetails: false },
        {
          [GenAISemanticConventions.GenAIToolCallArguments]: '{"query":"secret"}',
          [GenAISemanticConventions.GenAIToolCallResult]: '{"data":"confidential"}',
          'other.attr': 'keep-me',
        }
      );
      expect(GenAISemanticConventions.GenAIToolCallArguments in exported.attributes).toBe(false);
      expect(GenAISemanticConventions.GenAIToolCallResult in exported.attributes).toBe(false);
      expect(exported.attributes['other.attr']).toBe('keep-me');
    });

    it('preserves tool call arguments and result when includeToolDetails is true', () => {
      const exported = exportWith(
        { includeToolDetails: true },
        {
          [GenAISemanticConventions.GenAIToolCallArguments]: '{"query":"value"}',
          [GenAISemanticConventions.GenAIToolCallResult]: '{"data":"result"}',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallArguments]).toBe(
        '{"query":"value"}'
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallResult]).toBe(
        '{"data":"result"}'
      );
    });

    it('does not strip tool call I/O when only includeLlmResponses is false', () => {
      const exported = exportWith(
        { includeLlmResponses: false, includeToolDetails: true },
        {
          [GenAISemanticConventions.GenAIToolCallArguments]: '{"query":"value"}',
          [GenAISemanticConventions.GenAIToolCallResult]: '{"data":"result"}',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallArguments]).toBe(
        '{"query":"value"}'
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallResult]).toBe(
        '{"data":"result"}'
      );
    });
  });

  describe('sensitive attribute hashing', () => {
    it('hashes custom agent IDs but keeps built-in agent IDs', () => {
      const exported = exportWith(
        { includeRealIds: false },
        {
          [GenAISemanticConventions.GenAIAgentId]: 'user-custom-agent-uuid',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).toMatch(/^custom-/);
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).not.toBe(
        'user-custom-agent-uuid'
      );
    });

    it('preserves built-in (default) agent ID without hashing', () => {
      const exported = exportWith(
        { includeRealIds: false },
        {
          [GenAISemanticConventions.GenAIAgentId]: agentBuilderDefaultAgentId,
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentId]).toBe(
        agentBuilderDefaultAgentId
      );
    });

    it('hashes conversation IDs', () => {
      const exported = exportWith(
        { includeRealIds: false },
        {
          [GenAISemanticConventions.GenAIConversationId]: 'conv-uuid-123',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIConversationId]).toMatch(
        /^[a-f0-9]{16}$/
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIConversationId]).not.toBe(
        'conv-uuid-123'
      );
    });

    it('replaces user.id with user.hash when includeUserData is false', () => {
      const exported = exportWith(
        { includeUserData: false },
        {
          [UserAttributes.UserId]: 'profile-uid-or-realm-id',
        }
      );
      expect(exported.attributes[UserAttributes.UserHash]).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes[UserAttributes.UserHash]).not.toBe('profile-uid-or-realm-id');
      expect(exported.attributes[UserAttributes.UserId]).toBeUndefined();
    });

    it('preserves user.id when includeUserData is true', () => {
      const exported = exportWith(
        { includeUserData: true },
        {
          [UserAttributes.UserId]: 'profile-uid-or-realm-id',
        }
      );
      expect(exported.attributes[UserAttributes.UserId]).toBe('profile-uid-or-realm-id');
      expect(exported.attributes[UserAttributes.UserHash]).toBeUndefined();
    });

    it('hashes user.id even when includeRealIds is true if includeUserData is false', () => {
      const exported = exportWith(
        { includeRealIds: true, includeUserData: false },
        {
          [UserAttributes.UserId]: 'username-bearing-id',
          [GenAISemanticConventions.GenAIConversationId]: 'conv-uuid-123',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIConversationId]).toBe(
        'conv-uuid-123'
      );
      expect(exported.attributes[UserAttributes.UserHash]).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes[UserAttributes.UserId]).toBeUndefined();
    });

    it('hashes workflow IDs and execution IDs', () => {
      const exported = exportWith(
        { includeRealIds: false },
        {
          'elastic.workflow.id': 'workflow-uuid-456',
          'elastic.workflow.execution_id': 'exec-uuid-789',
        }
      );
      expect(exported.attributes['elastic.workflow.id']).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes['elastic.workflow.id']).not.toBe('workflow-uuid-456');
      expect(exported.attributes['elastic.workflow.execution_id']).toMatch(/^[a-f0-9]{16}$/);
      expect(exported.attributes['elastic.workflow.execution_id']).not.toBe('exec-uuid-789');
    });

    it('hashes kibana.workflows.run_id when real IDs are disabled, like elastic.workflow.execution_id', () => {
      // Same identifier class as `elastic.workflow.execution_id` above, so it obeys the same
      // includeRealIds policy: a second attribute name must not re-expose what it anonymizes.
      const hashed = exportWith(
        { includeRealIds: false },
        { [WORKFLOW_RUN_ID_ATTRIBUTE_NAME]: 'workflow-exec-uuid-abc' }
      );
      expect(hashed.attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).toMatch(/^[a-f0-9]{16}$/);
      expect(hashed.attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).not.toBe('workflow-exec-uuid-abc');

      // The join key still works when real IDs are on: the value stays queryable as-is.
      const raw = exportWith(
        { includeRealIds: true },
        { [WORKFLOW_RUN_ID_ATTRIBUTE_NAME]: 'workflow-exec-uuid-abc' }
      );
      expect(raw.attributes[WORKFLOW_RUN_ID_ATTRIBUTE_NAME]).toBe('workflow-exec-uuid-abc');
    });

    it('does NOT hash gen_ai.tool.call.id', () => {
      const exported = exportWith(
        { includeRealIds: false },
        {
          [GenAISemanticConventions.GenAIToolCallId]: 'call_abc123',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolCallId]).toBe('call_abc123');
    });

    it('produces stable hashes for the same input', () => {
      const exported1 = exportWith(
        { includeRealIds: false },
        { [GenAISemanticConventions.GenAIConversationId]: 'same-id' }
      );
      const exported2 = exportWith(
        { includeRealIds: false },
        { [GenAISemanticConventions.GenAIConversationId]: 'same-id' }
      );
      expect(exported1.attributes[GenAISemanticConventions.GenAIConversationId]).toBe(
        exported2.attributes[GenAISemanticConventions.GenAIConversationId]
      );
    });
  });

  describe('name anonymization', () => {
    it('anonymizes custom agent names to "custom"', () => {
      const exported = exportWith(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIAgentName]: 'my-custom-agent',
        },
        { name: 'invoke_agent my-custom-agent' }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentName]).toBe('custom');
      expect(exported.name).toBe('invoke_agent custom');
    });

    it('preserves built-in agent names', () => {
      const builtinAgentName = AGENT_BUILDER_BUILTIN_AGENTS[0];
      const exported = exportWith(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIAgentName]: builtinAgentName,
          [GenAISemanticConventions.GenAIAgentId]: builtinAgentName,
        },
        { name: `invoke_agent ${builtinAgentName}` }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIAgentName]).toBe(builtinAgentName);
      expect(exported.name).toBe(`invoke_agent ${builtinAgentName}`);
    });

    it('anonymizes workflow names to "custom"', () => {
      const exported = exportWith(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIWorkflowName]: 'my-secret-workflow',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIWorkflowName]).toBe('custom');
    });

    it('preserves workflow names when includeRealNames is true', () => {
      const exported = exportWith(
        { includeRealNames: true },
        {
          [GenAISemanticConventions.GenAIWorkflowName]: 'my-workflow',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIWorkflowName]).toBe('my-workflow');
    });

    it('strips tool definitions and description when includeRealNames is false', () => {
      const exported = exportWith(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIToolDefinitions]: JSON.stringify([
            { name: 'secret_internal_tool', description: 'Does secret things' },
          ]),
          [GenAISemanticConventions.GenAIToolDescription]: 'My confidential tool description',
        }
      );
      expect(GenAISemanticConventions.GenAIToolDefinitions in exported.attributes).toBe(false);
      expect(GenAISemanticConventions.GenAIToolDescription in exported.attributes).toBe(false);
    });

    it('strips conversation titles when includeRealNames is false', () => {
      const exported = exportWith(
        { includeRealNames: false },
        {
          [ElasticGenAIAttributes.ConversationTitle]: 'Kibana role configuration',
        }
      );
      expect(exported.attributes[ElasticGenAIAttributes.ConversationTitle]).toBeUndefined();
    });

    it('strips user names when includeUserData is false', () => {
      const exported = exportWith(
        { includeUserData: false },
        {
          [UserAttributes.UserName]: 'jane.doe',
        }
      );
      expect(exported.attributes[UserAttributes.UserName]).toBeUndefined();
    });

    it('preserves user names when includeUserData is true', () => {
      const exported = exportWith(
        { includeUserData: true },
        {
          [UserAttributes.UserName]: 'jane.doe',
        }
      );
      expect(exported.attributes[UserAttributes.UserName]).toBe('jane.doe');
    });

    it('strips user names even when includeRealNames is true if includeUserData is false', () => {
      const exported = exportWith(
        { includeRealNames: true, includeUserData: false },
        {
          [UserAttributes.UserName]: 'jane.doe',
          [ElasticGenAIAttributes.ConversationTitle]: 'My Chat',
        }
      );
      expect(exported.attributes[UserAttributes.UserName]).toBeUndefined();
      expect(exported.attributes[ElasticGenAIAttributes.ConversationTitle]).toBe('My Chat');
    });

    it('preserves conversation titles when includeRealNames is true', () => {
      const exported = exportWith(
        { includeRealNames: true },
        {
          [ElasticGenAIAttributes.ConversationTitle]: 'Kibana role configuration',
        }
      );
      expect(exported.attributes[ElasticGenAIAttributes.ConversationTitle]).toBe(
        'Kibana role configuration'
      );
    });

    it('preserves tool definitions and description when includeRealNames is true', () => {
      const definitions = JSON.stringify([{ name: 'my_tool', description: 'Does things' }]);
      const exported = exportWith(
        { includeRealNames: true },
        {
          [GenAISemanticConventions.GenAIToolDefinitions]: definitions,
          [GenAISemanticConventions.GenAIToolDescription]: 'My tool description',
        }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolDefinitions]).toBe(definitions);
      expect(exported.attributes[GenAISemanticConventions.GenAIToolDescription]).toBe(
        'My tool description'
      );
    });

    it('anonymizes custom tool name and execute_tool span name to "custom"', () => {
      const exported = exportWith(
        { includeRealNames: false },
        { [GenAISemanticConventions.GenAIToolName]: 'my-secret-tool' },
        { name: 'execute_tool my-secret-tool' }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolName]).toBe('custom');
      expect(exported.name).toBe('execute_tool custom');
    });

    it('preserves built-in tool name and execute_tool span name', () => {
      const builtinToolName = AGENT_BUILDER_BUILTIN_TOOLS[0];
      const exported = exportWith(
        { includeRealNames: false },
        {
          [GenAISemanticConventions.GenAIToolName]: builtinToolName,
        },
        { name: `execute_tool ${builtinToolName}` }
      );
      expect(exported.attributes[GenAISemanticConventions.GenAIToolName]).toBe(builtinToolName);
      expect(exported.name).toBe(`execute_tool ${builtinToolName}`);
    });
  });
});
