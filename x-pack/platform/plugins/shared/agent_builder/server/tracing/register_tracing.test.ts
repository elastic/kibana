/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ElasticsearchOtlpExporter } from '@kbn/tracing';
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

jest.mock('@kbn/tracing', () => ({
  LateBindingSpanProcessor: {
    register: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
  },
  ElasticsearchOtlpExporter: jest.fn(),
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

describe('registerTracingExporter', () => {
  const logger = loggerMock.create();

  function createCore() {
    const core = coreMock.createStart();
    const scopedUiSettings = jest.mocked(core.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);
    return core;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns undefined when no exporters are configured', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      send_to_self: false,
      exporters: [],
      scheduledDelay: 1000,
      opik_distributed_tracing: false,
    };

    const result = await registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(result).toBeUndefined();
    expect(LateBindingSpanProcessor.register).not.toHaveBeenCalled();
  });

  it('creates OTLPTraceExporter when exporters with url are configured', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      send_to_self: false,
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
    expect(MockedEsOtlpExporter).not.toHaveBeenCalled();
  });

  it('creates ElasticsearchOtlpExporter when send_to_self is true', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      send_to_self: true,
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
    expect(MockedOtlpExporter).not.toHaveBeenCalled();
  });

  it('registers processor via LateBindingSpanProcessor', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      send_to_self: true,
      exporters: [],
      scheduledDelay: 250,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    expect(LateBindingSpanProcessor.register).toHaveBeenCalledTimes(1);
    expect(MockedAgentBuilderProcessor).toHaveBeenCalledTimes(1);
    const [registeredProcessor] = jest.mocked(LateBindingSpanProcessor.register).mock.calls[0];
    expect(registeredProcessor).toBe(MockedAgentBuilderProcessor.mock.instances[0]);
  });

  it('createCachedIsEnabled returns true after registerTracingExporter resolves', async () => {
    const coreStart = createCore();
    const tracingConfig: TracingConfig = {
      send_to_self: true,
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({
      core: coreStart,
      tracingConfig,
      logger,
    });

    const ctorOpts = MockedAgentBuilderProcessor.mock.calls[0][0];
    const { isEnabled } = ctorOpts;
    expect(isEnabled!()).toBe(true);
  });

  it('refreshes the cached value when the polling interval fires', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);

    const tracingConfig: TracingConfig = {
      send_to_self: true,
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({ core: coreStart, tracingConfig, logger });

    const { isEnabled } = MockedAgentBuilderProcessor.mock.calls[0][0];
    expect(isEnabled!()).toBe(true);

    scopedUiSettings.get.mockResolvedValue(false);
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    expect(isEnabled!()).toBe(false);
  });

  it('logs error when polling refresh rejects', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);

    const tracingConfig: TracingConfig = {
      send_to_self: true,
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    await registerTracingExporter({ core: coreStart, tracingConfig, logger });

    scopedUiSettings.get.mockRejectedValue(new Error('SO unavailable'));
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch tracing settings')
    );
  });

  it('teardown stops polling and shuts down processors', async () => {
    const coreStart = createCore();
    const scopedUiSettings = jest.mocked(coreStart.uiSettings.asScopedToClient(jest.fn() as never));
    scopedUiSettings.get.mockResolvedValue(true);

    const tracingConfig: TracingConfig = {
      send_to_self: true,
      exporters: [],
      scheduledDelay: 100,
      opik_distributed_tracing: false,
    };

    const teardown = await registerTracingExporter({ core: coreStart, tracingConfig, logger });
    expect(teardown).toBeDefined();

    await teardown!();

    scopedUiSettings.get.mockResolvedValue(false);
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    const { isEnabled } = MockedAgentBuilderProcessor.mock.calls[0][0];
    expect(isEnabled!()).toBe(true);
  });
});
