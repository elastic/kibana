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
import { LateBindingSpanProcessor, ElasticsearchOtlpExporter } from '@kbn/tracing';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { LRUCache } from 'lru-cache';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';

const SETTING_CACHE_TTL_MS = 30_000;

/**
 * Returns a synchronous `isEnabled()` function backed by an LRU cache with
 * stale-while-revalidate semantics.
 * We need the cache to prevent calling the async uiSettings read on the hot path.
 *
 * The span processor hot-path requires also required synchronous check, but the underlying uiSettings read is async.
 * The cache with `allowStale: true` ensures `isEnabled()` always returns instantly
 * (stale or fresh) while a background fetch refreshes the value every {@link SETTING_CACHE_TTL_MS} ms.
 */
const createCachedIsEnabled = async (core: CoreStart, logger: Logger): Promise<() => boolean> => {
  const cache = new LRUCache<string, boolean>({
    max: 1,
    ttl: SETTING_CACHE_TTL_MS,
    allowStale: true,
    noDeleteOnStaleGet: true,
    noDeleteOnFetchRejection: true,
    fetchMethod: async () => {
      const internalRepo = core.savedObjects.createInternalRepository();
      const internalClient = new SavedObjectsClient(internalRepo);
      return core.uiSettings
        .asScopedToClient(internalClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    },
  });

  // Eagerly populate the cache so the first synchronous isEnabled() call has a value
  await cache.fetch('enabled').catch((error) => {
    logger.error(`Failed to fetch tracing settings: ${error.message}`);
  });

  return () => {
    // Stale-while-revalidate: trigger a background refresh when the entry is past TTL.
    void cache.fetch('enabled').catch((error) => {
      logger.error(`Failed to refresh tracing settings: ${error.message}`);
    });
    return cache.get('enabled') ?? false;
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

  const isEnabled = await createCachedIsEnabled(core, logger);

  const tearDowns = exporters.map((exporter) => {
    const processor = new AgentBuilderSpanProcessor({
      exporter,
      scheduledDelayMillis: tracingConfig.scheduledDelay,
      isEnabled,
    });
    return LateBindingSpanProcessor.register(processor);
  });

  return async () => {
    await Promise.all(tearDowns.map((teardown) => teardown()));
  };
};
