/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingOtlpExportConfig } from '@kbn/inference-tracing-config';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterProto } from '@opentelemetry/exporter-trace-otlp-proto';
import { diag } from '@opentelemetry/api';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
import { IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME } from '../root_inference_span';

export class OTLPSpanProcessor extends BaseInferenceSpanProcessor {
  private readonly config: InferenceTracingOtlpExportConfig;

  constructor(config: InferenceTracingOtlpExportConfig, protocol: 'grpc' | 'http') {
    diag.info(`Initializing OTLP exporter with protocol: ${protocol}, url: ${config.url}`);

    const exporter =
      protocol === 'grpc'
        ? new OTLPTraceExporterProto({
            url: config.url,
            headers: config.headers,
          })
        : new OTLPTraceExporterHTTP({
            url: config.url,
            headers: config.headers,
          });

    super(exporter, config.scheduled_delay);
    this.config = config;
    diag.info('OTLP span processor initialized successfully');
  }

  processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan {
    // Orphan @kbn/evals spans to make them queryable as roots in OTLP
    if (span.attributes['inscrumentationScope.name'] === '@kbn/evals' && span.parentSpanContext) {
      span = {
        ...span,
        spanContext: span.spanContext.bind(span),
        parentSpanContext: undefined,
      };
    }

    // Clean up internal tracking attributes
    delete span.attributes._should_track;
    delete span.attributes[IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME];

    if (!span.parentSpanContext) {
      const traceId = span.spanContext().traceId;
      diag.info(
        `OTLP: Exporting root span "${span.name}" (trace: ${traceId}) to ${this.config.url}`
      );
    }
    return span;
  }
}
