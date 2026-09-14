/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ElasticsearchOtlpExporter, EvalSpanProcessor } from '@kbn/tracing';
import { initInferenceTracerProvider } from '@kbn/inference-tracing';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderConfig } from '../config';
import { registerTracingExporter } from './register_tracing';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { DATA_STREAM_NAMESPACE_ATTR } from './agent_builder_context';

jest.mock('@kbn/inference-tracing', () => ({
  initInferenceTracerProvider: jest.fn(),
  shutdownInferenceTracerProvider: jest.fn().mockResolvedValue(undefined),
  EXECUTION_ID_BAGGAGE_KEY: 'execution.id.baggage.key',
  EVAL_EXPERIMENT_ID_BAGGAGE_KEY: 'experiment.id.baggage.key',
  EVALUATOR_NAME_BAGGAGE_KEY: 'evaluator.name.baggage.key',
}));

jest.mock('./global_bridge_processor', () => ({
  GlobalBridgeProcessor: jest.fn(),
}));

jest.mock('./opik_distributed_tracing', () => ({
  OpikDistributedTracingSpanProcessor: jest.fn(),
}));

const mockResource = {
  attributes: { 'service.name': 'kibana' },
  waitForAsyncAttributes: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@kbn/telemetry', () => ({
  buildOtelResources: jest.fn(() => mockResource),
}));

const mockLateBindingInstance = {
  onStart: jest.fn(),
  onEnd: jest.fn(),
  forceFlush: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@kbn/tracing', () => ({
  LateBindingSpanProcessor: {
    register: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
    hasInstance: jest.fn(() => false),
    get: jest.fn(() => mockLateBindingInstance),
  },
  ElasticsearchOtlpExporter: jest.fn(),
  EvalSpanProcessor: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
  OTLPTraceExporter: jest.fn(),
}));

jest.mock('./agent_builder_span_processor', () => ({
  AgentBuilderSpanProcessor: jest.fn(),
}));

type TracingConfig = AgentBuilderConfig['tracing'];

const MockedOtlpExporter = OTLPTraceExporter as jest.MockedClass<typeof OTLPTraceExporter>;
const MockedEsOtlpExporter = ElasticsearchOtlpExporter as jest.MockedClass<
  typeof ElasticsearchOtlpExporter
>;
const MockedAgentBuilderProcessor = AgentBuilderSpanProcessor as jest.MockedClass<
  typeof AgentBuilderSpanProcessor
>;
const MockedEvalSpanProcessor = EvalSpanProcessor as jest.MockedClass<typeof EvalSpanProcessor>;

describe('registerTracingExporter', () => {
  const logger = loggerMock.create();

  function createCore() {
    const core = coreMock.createStart();
    core.savedObjects.getUnsafeInternalClient.mockReturnValue({
      asScopedToNamespace: jest.fn((namespace: string) => ({ namespace })),
    } as never);
    const scopedUiSettings = jest.mocked(core.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);
    return core;
  }

  beforeEach(() => {
    jest.clearAllMocks();
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
      logger,
    });

    // Pipeline is always initialized so the uiSetting can toggle tracing without a restart.
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
      logger,
    });

    expect(MockedOtlpExporter).toHaveBeenCalledWith({
      url: 'http://otel-collector:4318/v1/traces',
      headers: { Authorization: 'Bearer token' },
    });
    // ES exporter is always created alongside external exporters.
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
      logger,
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
      logger,
    });

    expect(initInferenceTracerProvider).toHaveBeenCalledTimes(1);
    expect(MockedAgentBuilderProcessor).toHaveBeenCalledTimes(1);
    expect(MockedEvalSpanProcessor).toHaveBeenCalledWith([
      { baggageKey: 'execution.id.baggage.key' },
      { baggageKey: 'experiment.id.baggage.key' },
      { baggageKey: 'evaluator.name.baggage.key', attributeKey: 'evaluator.name' },
      { baggageKey: 'agent_builder.space_id', attributeKey: DATA_STREAM_NAMESPACE_ATTR },
    ]);
    const [providerOpts] = jest.mocked(initInferenceTracerProvider).mock.calls[0];
    expect(providerOpts.processors).toHaveLength(3);
    expect(providerOpts.resource).toBe(mockResource);
    expect(mockResource.waitForAsyncAttributes).toHaveBeenCalledTimes(1);
  });

  it('getSettings reads current uiSettings for the requested space', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);

    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    const { getSettings } = MockedAgentBuilderProcessor.mock.calls[0][0];
    expect((await getSettings('marketing')).enabled).toBe(true);
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith({ namespace: 'marketing' });

    scopedUiSettings.get.mockResolvedValue(false);
    expect((await getSettings('marketing')).enabled).toBe(false);
  });

  it('getSettings scopes each space independently', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);

    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({ core: coreStart, tracingConfig, logger });

    const { getSettings } = MockedAgentBuilderProcessor.mock.calls[0][0];
    await getSettings('space-a');
    await getSettings('space-b');

    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith({ namespace: 'space-a' });
    expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith({ namespace: 'space-b' });
  });

  it('logs error and fail-closes when settings lookup rejects', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockRejectedValue(new Error('SO unavailable'));

    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({ core: coreStart, tracingConfig, logger });

    const { getSettings } = MockedAgentBuilderProcessor.mock.calls[0][0];
    const settings = await getSettings();

    expect(settings.enabled).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch tracing settings for space [default]')
    );
  });

  it('teardown shuts down processors', async () => {
    const { shutdownInferenceTracerProvider } = jest.requireMock('@kbn/inference-tracing');
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    const teardown = await registerTracingExporter({ core: coreStart, tracingConfig, logger });
    expect(teardown).toBeDefined();

    await teardown!();

    expect(shutdownInferenceTracerProvider).toHaveBeenCalled();
  });
});
