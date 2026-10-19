/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  // RESEARCH BRANCH ONLY: enabled by default so serverless images carry the harness.
  enabled: schema.boolean({ defaultValue: true }),
  /** RESEARCH ONLY: per-class execution pool bound; requests remain main unless explicitly opted in. */
  isolatedMaxThreads: schema.number({ defaultValue: 2, min: 1, max: 10 }),
  /** Main-thread heartbeat cadence written to shared memory and watched by the probe worker. */
  heartbeatIntervalMs: schema.number({ defaultValue: 5, min: 1, max: 1000 }),
  /** Worker-side heartbeat check cadence. */
  samplerIntervalMs: schema.number({ defaultValue: 2, min: 1, max: 1000 }),
  /** Gap above which the sampler records a stall episode. */
  stallThresholdMs: schema.number({ defaultValue: 20, min: 1, max: 60000 }),
  /** Ring buffer capacity (entries) for each sample source. */
  ringCapacity: schema.number({ defaultValue: 200000, min: 1000, max: 2000000 }),
  /**
   * Push samples to the project's ES (`.kibana-research-samples`) so pods that are not
   * routable (serverless background-tasks pods) or that get killed still leave evidence.
   */
  pushToEs: schema.boolean({ defaultValue: true }),
  pushIntervalMs: schema.number({ defaultValue: 2000, min: 200, max: 60000 }),
  /** Per-GC samples (PerformanceObserver). Can be switched off for perturbation calibration. */
  collectGc: schema.boolean({ defaultValue: true }),
  /**
   * Canned OpenAI-compatible LLM for the Agent Builder replay. Separately gated; requires a
   * bearer secret (generated per project, readable by superusers via GET mock_llm/_secret).
   */
  mockLlm: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    maxBodyBytes: schema.number({ defaultValue: 1024 * 1024, min: 1024, max: 64 * 1024 * 1024 }),
    maxHangMs: schema.number({ defaultValue: 60000, min: 0, max: 600000 }),
    maxConcurrent: schema.number({ defaultValue: 8, min: 1, max: 100 }),
  }),
});

export type WorkloadIsolationResearchConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkloadIsolationResearchConfig> = {
  schema: configSchema,
};
