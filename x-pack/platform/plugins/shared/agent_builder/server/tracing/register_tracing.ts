/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { SavedObjectsClient } from '@kbn/core/server';
import { buildOtelResources } from '@kbn/telemetry';
import {
  ElasticsearchOtlpExporter,
  LateBindingSpanProcessor,
  EvalSpanProcessor,
} from '@kbn/tracing';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  EXECUTION_ID_BAGGAGE_KEY,
  EVAL_EXPERIMENT_ID_BAGGAGE_KEY,
} from '@kbn/inference-tracing';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { GlobalBridgeProcessor } from './global_bridge_processor';
import { OpikDistributedTracingSpanProcessor } from './opik_distributed_tracing';
import { DATA_STREAM_NAMESPACE_ATTR, SPACE_ID_BAGGAGE_KEY } from './agent_builder_context';

const SETTING_CACHE_TTL_MS = 30_000;

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
      logger.error(`Failed to fetch tracing settings: ${error.message}`);
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

  const processors: tracing.SpanProcessor[] = [
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

  processors.push(
    new EvalSpanProcessor([
      { baggageKey: EXECUTION_ID_BAGGAGE_KEY },
      { baggageKey: EVAL_EXPERIMENT_ID_BAGGAGE_KEY },
      { baggageKey: SPACE_ID_BAGGAGE_KEY, attributeKey: DATA_STREAM_NAMESPACE_ATTR },
    ])
  );

  const lateBindingProcessor = LateBindingSpanProcessor.get();
  if (lateBindingProcessor) {
    processors.push(new GlobalBridgeProcessor(lateBindingProcessor));
  }

  const resource = buildOtelResources();
  await resource.waitForAsyncAttributes?.();

  initInferenceTracerProvider({
    processors,
    resource,
  });

  return async () => {
    stopPolling();
    await shutdownInferenceTracerProvider();
  };
};
