/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InferenceTracingLangfuseExportConfig {
  base_url: string;
  public_key: string;
  secret_key: string;
  scheduled_delay: number;
}

export interface InferenceTracingPhoenixExportConfig {
  base_url: string;
  public_url?: string;
  project_name?: string;
  api_key?: string;
  scheduled_delay: number;
}

export interface InferenceTracingExportConfig {
  exporter?: InferenceTracingLangfuseExportConfig | InferenceTracingPhoenixExportConfig;
}
