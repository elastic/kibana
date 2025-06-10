/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration schema for the Langfuse exporter.
 *
 * @internal
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
 *
 * @internal
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
 * Configuration schema for inference tracing exporters.
 *
 * @internal
 */
export interface InferenceTracingExportConfig {
  /**
   * Defines to which system inference spans will be exported.
   * Should be one of {@link InferenceTracingLangfuseExportConfig}
   * or {@link InferenceTracingPhoenixExportConfig}
   */
  exporter?: InferenceTracingLangfuseExportConfig | InferenceTracingPhoenixExportConfig;
}
