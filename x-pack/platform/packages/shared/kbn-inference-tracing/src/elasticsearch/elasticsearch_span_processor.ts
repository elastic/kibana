/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTracingElasticsearchExportConfig } from '@kbn/inference-tracing-config';
import { diag } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
import { GenAISemanticConventions, ElasticGenAIAttributes } from '../types';
import { ElasticsearchExporter } from './elasticsearch_exporter';

/**
 * ElasticsearchSpanProcessor is a span processor that exports inference traces
 * directly to an Elasticsearch cluster for storage and analysis.
 *
 * This tracer follows the same pattern as LangfuseSpanProcessor and PhoenixSpanProcessor,
 * extending BaseInferenceSpanProcessor to handle inference-specific span filtering
 * and processing.
 */
export class ElasticsearchSpanProcessor extends BaseInferenceSpanProcessor {
  private readonly indexName: string;

  constructor(private readonly config: InferenceTracingElasticsearchExportConfig) {
    const exporter = new ElasticsearchExporter(config);

    super(exporter, config.scheduled_delay);

    this.indexName = config.index_name ?? 'inference-traces';
  }

  processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan {
    // Add inference span kind if not already set based on operation type
    const operationName = span.attributes[GenAISemanticConventions.GenAIOperationName];
    if (!span.attributes[ElasticGenAIAttributes.InferenceSpanKind]) {
      if (operationName === 'chat') {
        span.attributes[ElasticGenAIAttributes.InferenceSpanKind] = 'LLM';
      } else if (operationName === 'execute_tool') {
        span.attributes[ElasticGenAIAttributes.InferenceSpanKind] = 'TOOL';
      }
    }

    // Log trace info for root spans
    if (!span.parentSpanContext) {
      const traceId = span.spanContext().traceId;
      diag.info(`Trace ${traceId} exported to Elasticsearch index: ${this.indexName}`);
    }

    return span;
  }
}
