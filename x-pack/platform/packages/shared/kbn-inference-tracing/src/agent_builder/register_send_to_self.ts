/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTracingAgentBuilderExportConfig } from '@kbn/inference-tracing-config';
import { LateBindingSpanProcessor } from '@kbn/tracing';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import type { ElasticsearchTransport } from './elasticsearch_otlp_exporter';
import { ElasticsearchOtlpExporter } from './elasticsearch_otlp_exporter';

/**
 * Registers the Agent Builder span processor in "send_to_self" mode,
 * using Kibana's own Elasticsearch client to ship spans to `/_otlp/v1/traces`.
 *
 * Call this once the ES client is available (e.g. in a plugin's `setup` or `start`).
 *
 * @returns A teardown function that unregisters the processor.
 */
export const registerAgentBuilderSendToSelf = ({
  esClient,
  config,
}: {
  esClient: ElasticsearchTransport;
  config: InferenceTracingAgentBuilderExportConfig;
}): (() => Promise<void>) => {
  const exporter = new ElasticsearchOtlpExporter(esClient);
  const processor = new AgentBuilderSpanProcessor({
    exporter,
    scheduledDelayMillis: config.scheduled_delay,
  });

  return LateBindingSpanProcessor.register(processor);
};
