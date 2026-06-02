/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  aesop: schema.object({
    // AESOP is still actively iterated on in this branch, so the default
    // is `true`: the exploration UI, proposed-skill saved object type, AESOP
    // routes, and ILM-policy bootstrap are all wired up out of the box.
    // Operators who don't want any of that can opt out by setting
    // `xpack.evals.aesop.enabled: false` in kibana.yml — the plugin will
    // log a one-line notice on setup confirming the disable. Flip this
    // default to `false` before promoting AESOP to a production-default
    // feature.
    enabled: schema.boolean({ defaultValue: true }),
    // Operator-tunable rate limits per authenticated user. Defaults are
    // tuned for the Technical Preview (re-running an exploration during a
    // demo should be cheap). Production deployments should override these
    // in kibana.yml to match their connector cost tolerance.
    rateLimits: schema.object({
      // When the rate-limiter ES backend is unreachable (e.g. cluster
      // partition, .aesop-rate-limits index blocked by ILM), should we
      // fail-OPEN (allow the request, the historical demo behavior) or
      // fail-CLOSED (deny it, recommended for production where the
      // limiter exists specifically to bound connector cost). Default is
      // false to preserve the current demo posture; flip to `true` in
      // kibana.yml for any deployment where bypassed limits are a real
      // money / abuse problem. Either way, the fail-open path now records
      // an `aesop.rate_limiter.failure` event on the active OTLP span and
      // logs a warning, so operators can alert on the bypass even when
      // running in fail-open mode.
      failClosed: schema.boolean({ defaultValue: false }),
      exploration: schema.object({
        maxRequests: schema.number({ defaultValue: 5, min: 1 }),
        windowSeconds: schema.number({ defaultValue: 3600, min: 60 }),
      }),
      validation: schema.object({
        maxRequests: schema.number({ defaultValue: 30, min: 1 }),
        windowSeconds: schema.number({ defaultValue: 3600, min: 60 }),
      }),
      approval: schema.object({
        maxRequests: schema.number({ defaultValue: 50, min: 1 }),
        windowSeconds: schema.number({ defaultValue: 3600, min: 60 }),
      }),
    }),
    // Hard ceiling for an entire 5-phase exploration run. If a phase hangs
    // (LLM stall, ES partition, infinite tool loop) the orchestrator marks
    // the execution failed and lets the user retry instead of leaking
    // background work. Default is 45 minutes — comfortable headroom over a
    // single-cycle Opus run (~10–15 min) without letting a stuck pipeline
    // burn connector quota indefinitely.
    explorationTimeoutMs: schema.number({ defaultValue: 45 * 60 * 1000, min: 60_000 }),
  }),
});

export type EvalsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EvalsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    aesop: true,
  },
};
