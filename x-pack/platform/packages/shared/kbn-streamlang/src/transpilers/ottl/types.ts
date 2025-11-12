/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OTTLStatement {
  context: 'log' | 'resource' | 'scope';
  conditions?: string[];
  statements: string[];
}

export interface OTTLTransformProcessor {
  error_mode?: 'ignore' | 'propagate';
  log_statements: OTTLStatement[];
}

/**
 * OTEL collector configuration for dynamic processor injection
 *
 * This is the format expected by elasticpipelineextension for Elasticsearch documents.
 * It contains ONLY processor configurations - no pipelines, connectors, receivers, or exporters.
 *
 * The static OTEL config (config.sampling.yaml) defines the pipeline structure and references
 * these dynamic processors by name (e.g., transform/stream_processing).
 *
 * @see https://www.elastic.co/guide/en/observability/current/otel-collector-config.html
 */
export interface OTELConfig {
  /** Processor configurations that will be injected into static pipelines */
  processors: Record<string, OTTLTransformProcessor | any>;
}

export interface OTTLTranspilationOptions {
  /** Include JSON parsing at root */
  includeJsonParsing?: boolean;
  /** Default receiver (filelog, otlp, etc.) */
  receiver?: string;
  /** Elasticsearch exporter config */
  elasticsearchEndpoint?: string;
  elasticsearchApiKey?: string;
  /** Error handling */
  ignoreUnsupportedProcessors?: boolean;
  /** Debug output */
  includeDebugExporter?: boolean;
}

export interface OTELConfigGeneratorOptions extends OTTLTranspilationOptions {
  /** Receiver configuration (deprecated - receivers defined in static config) */
  receiverType?: 'filelog' | 'otlp';
  filelogInclude?: string[];

  /** Output configuration (deprecated - exporters defined in static config) */
  outputIndex?: string;

  /** Stream filtering */
  includeOnlyStreamsWithProcessing?: boolean;
}
