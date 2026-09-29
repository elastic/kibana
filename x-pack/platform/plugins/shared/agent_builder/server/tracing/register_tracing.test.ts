/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedClass } from 'vitest';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ElasticsearchOtlpExporter, EvalSpanProcessor } from '@kbn/tracing';
import { initInferenceTracerProvider } from '@kbn/inference-tracing';
import { coreMock } from '@kbn/core/server/mocks';
import type { AgentBuilderConfig } from '../config';
import { registerTracingExporter } from './register_tracing';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { DATA_STREAM_NAMESPACE_ATTR } from './agent_builder_context';

vi.mock('@kbn/inference-tracing', () => {
  const mocked = {
    initInferenceTracerProvider: vi.fn(),
    shutdownInferenceTracerProvider: vi.fn().mockResolvedValue(undefined),
    EXECUTION_ID_BAGGAGE_KEY: 'execution.id.baggage.key',
    EVAL_EXPERIMENT_ID_BAGGAGE_KEY: 'experiment.id.baggage.key',
    EVALUATOR_NAME_BAGGAGE_KEY: 'evaluator.name.baggage.key',
  };
  return { ...mocked, default: mocked };
});

vi.mock('./global_bridge_processor', () => {
  const mocked = {
    GlobalBridgeProcessor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./opik_distributed_tracing', () => {
  const mocked = {
    OpikDistributedTracingSpanProcessor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockResource = {
  attributes: { 'service.name': 'kibana' },
  waitForAsyncAttributes: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@kbn/telemetry', () => {
  const mocked = {
    buildOtelResources: vi.fn(() => mockResource),
  };
  return { ...mocked, default: mocked };
});

const mockLateBindingInstance = {
  onStart: vi.fn(),
  onEnd: vi.fn(),
  forceFlush: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@kbn/tracing', () => {
  const mocked = {
    LateBindingSpanProcessor: {
      register: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
      hasInstance: vi.fn(() => false),
      get: vi.fn(() => mockLateBindingInstance),
    },
    ElasticsearchOtlpExporter: vi.fn(),
    EvalSpanProcessor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => {
  const mocked = {
    OTLPTraceExporter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./agent_builder_span_processor', () => {
  const mocked = {
    AgentBuilderSpanProcessor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

type TracingConfig = AgentBuilderConfig['tracing'];

const MockedOtlpExporter = OTLPTraceExporter as MockedClass<typeof OTLPTraceExporter>;
const MockedEsOtlpExporter = ElasticsearchOtlpExporter as MockedClass<
  typeof ElasticsearchOtlpExporter
>;
const MockedAgentBuilderProcessor = AgentBuilderSpanProcessor as MockedClass<
  typeof AgentBuilderSpanProcessor
>;
const MockedEvalSpanProcessor = EvalSpanProcessor as MockedClass<typeof EvalSpanProcessor>;

describe('registerTracingExporter', () => {
  function createCore() {
    return coreMock.createStart();
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always initializes the tracing pipeline (ES exporter is always set up for uiSetting-based toggling)', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 1000,
      opik_distributed_tracing: false,
    };

    const result = await registerTracingExporter({
      core: coreStart,
      tracingConfig,
    });

    expect(result).toBeDefined();
    expect(MockedEsOtlpExporter).toHaveBeenCalledWith(
      coreStart.elasticsearch.client.asInternalUser
    );
    expect(initInferenceTracerProvider).toHaveBeenCalled();
  });

  it('creates OTLPTraceExporter when exporters with url are configured', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [
        {
          url: 'http://otel-collector:4318/v1/traces',
          headers: { Authorization: 'Bearer token' },
        },
      ],
      scheduledDelay: 750,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
    });

    expect(MockedOtlpExporter).toHaveBeenCalledWith({
      url: 'http://otel-collector:4318/v1/traces',
      headers: { Authorization: 'Bearer token' },
    });
    expect(MockedEsOtlpExporter).toHaveBeenCalledWith(
      coreStart.elasticsearch.client.asInternalUser
    );
  });

  it('creates ElasticsearchOtlpExporter (always)', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 500,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
    });

    expect(MockedEsOtlpExporter).toHaveBeenCalledWith(
      coreStart.elasticsearch.client.asInternalUser
    );
  });

  it('initializes inference tracer provider with span processors', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 250,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
    });

    expect(initInferenceTracerProvider).toHaveBeenCalledTimes(1);
    expect(MockedAgentBuilderProcessor).toHaveBeenCalledTimes(1);
    expect(MockedAgentBuilderProcessor).toHaveBeenCalledWith({
      exporter: expect.any(Object),
      scheduledDelayMillis: 250,
    });
    expect(MockedEvalSpanProcessor).toHaveBeenCalledWith([
      { baggageKey: 'execution.id.baggage.key' },
      { baggageKey: 'experiment.id.baggage.key' },
      { baggageKey: 'evaluator.name.baggage.key', attributeKey: 'evaluator.name' },
      { baggageKey: 'agent_builder.space_id', attributeKey: DATA_STREAM_NAMESPACE_ATTR },
    ]);
    const [providerOpts] = vi.mocked(initInferenceTracerProvider).mock.calls[0];
    expect(providerOpts.processors).toHaveLength(3);
    expect(providerOpts.resource).toBe(mockResource);
    expect(mockResource.waitForAsyncAttributes).toHaveBeenCalledTimes(1);
  });

  it('teardown shuts down processors', async () => {
    const { shutdownInferenceTracerProvider } = vi.mocked(await import('@kbn/inference-tracing'));
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    const teardown = await registerTracingExporter({ core: coreStart, tracingConfig });
    expect(teardown).toBeDefined();

    await teardown!();

    expect(shutdownInferenceTracerProvider).toHaveBeenCalled();
  });
});
