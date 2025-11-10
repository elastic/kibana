/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration document stored in .elastic-sampling-config index
 * This configuration is read by the OTel collector to determine sampling behavior
 */
export interface SamplingConfig {
  enabled: boolean;
  priority: number;
  match: {
    stream: string;
    condition?: string;
  };
  sample_rate: number;
  updated_at: string;
}

/**
 * API request to configure sampling
 */
export interface ConfigureSamplingRequest {
  condition?: string;
}

/**
 * API response from sampling configuration operations
 */
export interface SamplingConfigResponse {
  success: boolean;
  updated_at: string;
}

/**
 * API response for sampling status check
 */
export interface SamplingStatusResponse {
  enabled: boolean;
  condition?: string;
  updated_at: string;
  sample_rate: number;
}
