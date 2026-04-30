/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ElasticsearchOtlpExporter } from '@kbn/inference-tracing';
import { LateBindingSpanProcessor } from '@kbn/tracing';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderConfig } from '../config';
import { registerTracingExporter } from './register_tracing';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';

jest.mock('@kbn/core/server', () => {
  const actual = jest.requireActual('@kbn/core/server');
  return {
    ...actual,
    SavedObjectsClient: jest.fn(() => ({})),
  };
});

jest.mock('lru-cache', () => ({
  LRUCache: jest.fn().mockImplementation((options: { fetchMethod: () => Promise<boolean> }) => {
    let stored: boolean | undefined;
    const pendingLoad = Promise.resolve().then(async () => {
      stored = await options.fetchMethod();
    });
    return {
      fetch: jest.fn(() => pendingLoad),
      get: jest.fn(() => stored),
    };
  }),
}));

jest.mock('@kbn/tracing', () => ({
  LateBindingSpanProcessor: {
    register: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
  },
}));

jest.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
  OTLPTraceExporter: jest.fn(),
}));

jest.mock('@kbn/inference-tracing', () => ({
  ElasticsearchOtlpExporter: jest.fn(),
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

describe('registerTracingExporter', () => {
  const logger = loggerMock.create();

  afterEach(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  function createCore() {
    const core = coreMock.createStart();
    const scopedUiSettings = jest.mocked(core.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);
    return core;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when tracing is disabled', () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      enabled: false,
      scheduledDelay: 1000,
    };

    const result = registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(result).toBeUndefined();
    expect(LateBindingSpanProcessor.register).not.toHaveBeenCalled();
  });

  it('creates OTLPTraceExporter when url is configured', () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      enabled: true,
      url: 'http://otel-collector:4318/v1/traces',
      headers: { Authorization: 'Bearer token' },
      scheduledDelay: 750,
    };

    registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(MockedOtlpExporter).toHaveBeenCalledWith({
      url: tracingConfig.url,
      headers: { Authorization: 'Bearer token' },
    });
    expect(MockedEsOtlpExporter).not.toHaveBeenCalled();
  });

  it('creates ElasticsearchOtlpExporter when no url is configured', () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      enabled: true,
      scheduledDelay: 500,
    };

    registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(MockedEsOtlpExporter).toHaveBeenCalledWith(
      coreStart.elasticsearch.client.asInternalUser
    );
    expect(MockedOtlpExporter).not.toHaveBeenCalled();
  });

  it('registers processor via LateBindingSpanProcessor', () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      enabled: true,
      scheduledDelay: 250,
    };

    registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(LateBindingSpanProcessor.register).toHaveBeenCalledTimes(1);
    expect(MockedAgentBuilderProcessor).toHaveBeenCalledTimes(1);
    const [registeredProcessor] = jest.mocked(LateBindingSpanProcessor.register).mock.calls[0];
    expect(registeredProcessor).toBe(MockedAgentBuilderProcessor.mock.instances[0]);
  });

  it('createCachedIsEnabled returns false initially then true after cache fetch', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      enabled: true,
      scheduledDelay: 100,
    };

    registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    const ctorOpts = MockedAgentBuilderProcessor.mock.calls[0][0];
    const { isEnabled } = ctorOpts;
    expect(isEnabled!()).toBe(false);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(isEnabled!()).toBe(true);
  });
});
