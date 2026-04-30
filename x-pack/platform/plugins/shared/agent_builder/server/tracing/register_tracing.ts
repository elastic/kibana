/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { SavedObjectsClient } from '@kbn/core/server';
import { LateBindingSpanProcessor } from '@kbn/tracing';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ElasticsearchOtlpExporter } from '@kbn/inference-tracing';
import { LRUCache } from 'lru-cache';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';

const SETTING_CACHE_TTL_MS = 30_000;

const createCachedIsEnabled = (core: CoreStart, logger: Logger): (() => boolean) => {
  const cache = new LRUCache<string, boolean>({
    max: 1,
    ttl: SETTING_CACHE_TTL_MS,
    allowStale: true,
    noDeleteOnFetchRejection: true,
    fetchMethod: async () => {
      const internalRepo = core.savedObjects.createInternalRepository();
      const internalClient = new SavedObjectsClient(internalRepo);
      return core.uiSettings
        .asScopedToClient(internalClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    },
  });

  cache.fetch('enabled').catch((error) => {
    logger.error(`Failed to fetch tracing settings: ${error.message}`);
  });

  return () => cache.get('enabled') ?? false;
};

export const registerTracingExporter = ({
  core,
  tracingConfig,
  logger,
}: {
  core: CoreStart;
  tracingConfig: AgentBuilderConfig['tracing'];
  logger: Logger;
}): (() => Promise<void>) | undefined => {
  if (!tracingConfig.enabled) {
    return undefined;
  }

  const exporter = tracingConfig.url
    ? new OTLPTraceExporter({
        url: tracingConfig.url,
        ...(tracingConfig.headers ? { headers: tracingConfig.headers } : {}),
      })
    : new ElasticsearchOtlpExporter(core.elasticsearch.client.asInternalUser);

  const processor = new AgentBuilderSpanProcessor({
    exporter,
    scheduledDelayMillis: tracingConfig.scheduledDelay,
    isEnabled: createCachedIsEnabled(core, logger),
  });

  return LateBindingSpanProcessor.register(processor);
};
