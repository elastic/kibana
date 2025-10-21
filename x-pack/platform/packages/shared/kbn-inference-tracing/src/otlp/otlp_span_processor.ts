/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingOTLPExportConfig } from '@kbn/inference-tracing-config';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterProto } from '@opentelemetry/exporter-trace-otlp-proto';
import { diag } from '@opentelemetry/api';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';

export class OTLPSpanProcessor extends BaseInferenceSpanProcessor {
  constructor(private readonly config: InferenceTracingOTLPExportConfig) {
    diag.info(`Initializing OTLP exporter with protocol: ${config.protocol}, url: ${config.url}`);

    try {
      const exporter =
        config.protocol === 'grpc'
          ? new OTLPTraceExporterProto({
              url: config.url,
              headers: config.headers,
            })
          : new OTLPTraceExporterHTTP({
              url: config.url,
              headers: config.headers,
            });

      super(exporter, config.scheduled_delay);
      diag.info('OTLP span processor initialized successfully');
    } catch (error) {
      diag.error(`Failed to initialize OTLP span processor: ${error}`);
      throw error;
    }
  }

  onStart(span: any, parentContext: any): void {
    super.onStart(span, parentContext);
  }

  onEnd(span: any): void {
    super.onEnd(span);
  }

  processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan {
    if (!span.parentSpanContext) {
      const traceId = span.spanContext().traceId;
      diag.info(
        `OTLP: Exporting root span "${span.name}" (trace: ${traceId}) to ${this.config.url}`
      );
    }
    return span;
  }
}
