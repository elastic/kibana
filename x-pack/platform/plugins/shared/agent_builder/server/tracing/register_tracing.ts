/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { tracing as otelSdkTracing } from '@elastic/opentelemetry-node/sdk';
import { SavedObjectsClient } from '@kbn/core/server';
import {
  InferencePreservingSampler,
  ElasticsearchOtlpExporter,
  LateBindingSpanProcessor,
} from '@kbn/tracing';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { Tracer } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { OpikDistributedTracingSpanProcessor } from './opik_distributed_tracing';

const SETTING_CACHE_TTL_MS = 30_000;

/**
 * Detects whether a real global TracerProvider has been registered.
 * When no provider is set, `trace.getTracerProvider()` returns a `ProxyTracerProvider`
 * wrapping a `NoopTracerProvider`. When `initTracing` has run, it returns the
 * `NodeTracerProvider`. We detect this by checking if the tracer's `startSpan`
 * produces a recording span.
 */
const isGlobalProviderSet = (): boolean => {
  const testSpan = trace.getTracer('__probe__').startSpan('__probe__');
  const isRecording = testSpan.isRecording();
  testSpan.end();
  return isRecording;
};

let agentBuilderTracerInstance: Tracer | undefined;

/**
 * Returns the agent builder tracer. Only available after {@link registerTracingExporter}
 * has been called successfully with at least one exporter configured.
 */
export const getAgentBuilderTracer = (): Tracer | undefined => agentBuilderTracerInstance;

/**
 * Returns a synchronous `isEnabled()` function that polls the uiSettings value
 * on a fixed interval. The span processor hot-path requires a synchronous check,
 * but the underlying uiSettings read is async — so we refresh in the background
 * every {@link SETTING_CACHE_TTL_MS} ms and return the last known value instantly.
 */
const createCachedIsEnabled = async (
  core: CoreStart,
  logger: Logger
): Promise<{ isEnabled: () => boolean; stopPolling: () => void }> => {
  let enabled = false;

  const refresh = async () => {
    try {
      const internalRepo = core.savedObjects.createInternalRepository();
      const internalClient = new SavedObjectsClient(internalRepo);
      enabled = await core.uiSettings
        .asScopedToClient(internalClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    } catch (error) {
      logger.error(
        `Failed to fetch tracing settings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  await refresh();
  const intervalId = setInterval(refresh, SETTING_CACHE_TTL_MS);

  return {
    isEnabled: () => enabled,
    stopPolling: () => clearInterval(intervalId),
  };
};

const buildExporters = (
  core: CoreStart,
  tracingConfig: AgentBuilderConfig['tracing']
): tracing.SpanExporter[] => {
  return [
    ...(tracingConfig.send_to_self
      ? [new ElasticsearchOtlpExporter(core.elasticsearch.client.asInternalUser)]
      : []),
    ...tracingConfig.exporters.map(
      ({ url, headers }) =>
        new OTLPTraceExporter({
          url,
          ...(headers ? { headers } : {}),
        })
    ),
  ];
};

export const registerTracingExporter = async ({
  core,
  tracingConfig,
  logger,
}: {
  core: CoreStart;
  tracingConfig: AgentBuilderConfig['tracing'];
  logger: Logger;
}): Promise<(() => Promise<void>) | undefined> => {
  const exporters = buildExporters(core, tracingConfig);

  if (exporters.length === 0) {
    return undefined;
  }

  const { isEnabled, stopPolling } = await createCachedIsEnabled(core, logger);

  const spanProcessors = [
    ...(tracingConfig.opik_distributed_tracing ? [new OpikDistributedTracingSpanProcessor()] : []),
    ...exporters.map(
      (exporter) =>
        new AgentBuilderSpanProcessor({
          exporter,
          scheduledDelayMillis: tracingConfig.scheduledDelay,
          isEnabled,
        })
    ),
  ];

  const provider = new otelSdkTracing.BasicTracerProvider({
    sampler: new InferencePreservingSampler(
      new otelSdkTracing.ParentBasedSampler({ root: new otelSdkTracing.AlwaysOnSampler() })
    ),
    spanProcessors,
  });

  agentBuilderTracerInstance = provider.getTracer('agent-builder');

  // Check if a global tracer provider was already set (i.e., telemetry.tracing.enabled is true).
  // If so, register into LateBindingSpanProcessor for inference plugin spans.
  // Otherwise, register our provider as the global one so the inference tracer
  // (`trace.getTracer('inference')`) produces real spans processed by our pipeline.
  const hasGlobalProvider = isGlobalProviderSet();
  let globalTearDowns: Array<() => Promise<void>> = [];

  if (hasGlobalProvider) {
    globalTearDowns = [
      ...(tracingConfig.opik_distributed_tracing
        ? [LateBindingSpanProcessor.register(new OpikDistributedTracingSpanProcessor())]
        : []),
      ...exporters.map((exporter) => {
        const processor = new AgentBuilderSpanProcessor({
          exporter,
          scheduledDelayMillis: tracingConfig.scheduledDelay,
          isEnabled,
        });
        return LateBindingSpanProcessor.register(processor);
      }),
    ];
  } else {
    trace.setGlobalTracerProvider(provider);
  }

  return async () => {
    stopPolling();
    agentBuilderTracerInstance = undefined;
    await Promise.all([provider.shutdown(), ...globalTearDowns.map((teardown) => teardown())]);
  };
};
