/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ElasticsearchInferenceSpanProcessor } from './elasticsearch_span_processor';
export type { ElasticsearchSpanProcessorConfig } from './elasticsearch_span_processor';
export { ElasticsearchSpanExporter } from './elasticsearch_span_exporter';
export { otelTracesIndexName, createOtelTracesStorage } from './otel_traces_storage';
export type { OtelTraceDocumentProperties, OtelTracesStorage } from './otel_traces_storage';
export { spanToDocument } from './span_to_document';
