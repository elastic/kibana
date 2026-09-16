/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
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
  EVALUATOR_NAME_BAGGAGE_KEY,
} from '@kbn/inference-tracing';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { GlobalBridgeProcessor } from './global_bridge_processor';
import { OpikDistributedTracingSpanProcessor } from './opik_distributed_tracing';
import { DATA_STREAM_NAMESPACE_ATTR, SPACE_ID_BAGGAGE_KEY } from './agent_builder_context';

export const registerTracingExporter = async ({
  core,
  tracingConfig,
}: {
  core: CoreStart;
  tracingConfig: AgentBuilderConfig['tracing'];
}): Promise<(() => Promise<void>) | undefined> => {
  const allExporters: tracing.SpanExporter[] = [
    new ElasticsearchOtlpExporter(core.elasticsearch.client.asInternalUser),
    ...tracingConfig.exporters.map(
      ({ url, headers }) =>
        new OTLPTraceExporter({
          url,
          ...(headers ? { headers } : {}),
        })
    ),
  ];

  const processors: tracing.SpanProcessor[] = [
    ...(tracingConfig.opik_distributed_tracing ? [new OpikDistributedTracingSpanProcessor()] : []),
    ...allExporters.map(
      (exporter) =>
        new AgentBuilderSpanProcessor({
          exporter,
          scheduledDelayMillis: tracingConfig.scheduledDelay,
        })
    ),
  ];

  processors.push(
    new EvalSpanProcessor([
      { baggageKey: EXECUTION_ID_BAGGAGE_KEY },
      { baggageKey: EVAL_EXPERIMENT_ID_BAGGAGE_KEY },
      { baggageKey: EVALUATOR_NAME_BAGGAGE_KEY, attributeKey: 'evaluator.name' },
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
    await shutdownInferenceTracerProvider();
  };
};
