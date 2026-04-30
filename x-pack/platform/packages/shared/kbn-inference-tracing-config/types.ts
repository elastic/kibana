/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration schema for the Langfuse exporter.
 */
export interface InferenceTracingLangfuseExportConfig {
  /**
   * The URL for Langfuse server and Langfuse UI.
   */
  base_url: string;
  /**
   * The public key for API requests to Langfuse server.
   */
  public_key: string;
  /**
   * The secret key for API requests to Langfuse server.
   */
  secret_key: string;
  /**
   * The delay in milliseconds before the exporter sends another
   * batch of spans.
   */
  scheduled_delay: number;
}

/**
 * Configuration schema for the Phoenix exporter.
 */
export interface InferenceTracingPhoenixExportConfig {
  /**
   * The URL for Phoenix server.
   */
  base_url: string;
  /**
   * The URL for Phoenix UI.
   */
  public_url?: string;
  /**
   * The project in which traces are stored. Used for
   * generating links to Phoenix UI.
   */
  project_name?: string;
  /**
   * The API key for API requests to Phoenix server.
   */
  api_key?: string;
  /**
   * The delay in milliseconds before the exporter sends another
   * batch of spans.
   */
  scheduled_delay: number;
}

/**
 * Configuration for the Agent Builder exporter that sends
 * inference spans to Elasticsearch via OTLP.
 *
 * When {@link send_to_self} is `true`, the exporter uses Kibana's own
 * Elasticsearch client to POST spans to `/_otlp/v1/traces`, so
 * `url` and `headers` must be omitted.
 */
export interface InferenceTracingAgentBuilderExportConfig {
  /**
   * When true, spans are shipped to the same Elasticsearch cluster
   * that Kibana is connected to, using Kibana's internal ES client.
   * `url` and `headers` must not be set in this mode.
   */
  send_to_self: boolean;
  /**
   * The OTLP receiver URL for Elasticsearch.
   * Required when `send_to_self` is false.
   */
  url?: string;
  /**
   * Optional headers for authentication or metadata.
   * Must not be set when `send_to_self` is true.
   */
  headers?: Record<string, string>;
  /**
   * When true, the processor forces the SAMPLED trace flag on
   * exported spans so they are always recorded at 100% for the
   * Agent Builder in-app tracer, regardless of the global sample rate.
   */
  force_sample: boolean;
  /**
   * The delay in milliseconds before the exporter sends another
   * batch of spans.
   */
  scheduled_delay: number;
}

/**
 * Configuration schema for inference tracing exporters.
 *
 * @internal
 */
export type InferenceTracingExportConfig =
  | { langfuse: InferenceTracingLangfuseExportConfig }
  | { phoenix: InferenceTracingPhoenixExportConfig }
  | { agent_builder: InferenceTracingAgentBuilderExportConfig };
