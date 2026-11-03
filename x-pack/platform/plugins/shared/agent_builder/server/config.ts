/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

const scheduledDelay = schema.conditional(
  schema.contextRef('dev'),
  true,
  schema.number({ defaultValue: 1000, min: 50 }),
  schema.number({ defaultValue: 5000, min: 50 })
);

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  githubBaseUrl: schema.string({ defaultValue: 'https://github.com' }),
  topSnippets: schema.object({
    numSnippets: schema.number({ defaultValue: 2, min: 1, max: 10 }),
    numWords: schema.number({ defaultValue: 750, min: 1, max: 5000 }),
  }),
  tracing: schema.object({
    exporters: schema.arrayOf(
      schema.object({
        url: schema.uri({ scheme: ['http', 'https'] }),
        headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
      }),
      { defaultValue: [] }
    ),
    opik_distributed_tracing: schema.boolean({ defaultValue: false }),
    scheduledDelay,
  }),
  /**
   * Decision models used for quick decisions, such as whether `trigger_mode: 'auto'` runs the agent.
   * Providers are tried in order: OpenRouter when configured, the cluster's `decision` endpoint
   * (`inferenceId`, else the first one listed), then Agent Builder's fast model.
   */
  decisionModel: schema.object({
    inferenceId: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
    triggerThreshold: schema.number({ defaultValue: 0.5, min: 0, max: 1 }),
    /** How long each decision provider gets before the next one is tried. */
    timeoutMs: schema.number({ defaultValue: 1000, min: 100, max: 30000 }),
    /** How long the fast model gets: an LLM call is slower than a decision model. */
    fastModelTimeoutMs: schema.number({ defaultValue: 2000, min: 100, max: 30000 }),
    /**
     * Temporary dev path: ask OpenRouter's Decisions API directly instead of Elasticsearch, until
     * decision models are served by EIS. To be removed once they are.
     */
    openRouter: schema.maybe(
      schema.object({
        apiKey: schema.string({ minLength: 1, maxLength: 512 }),
        model: schema.string({ defaultValue: 'typesafe/jev-1.13', minLength: 1, maxLength: 256 }),
        url: schema.uri({ scheme: ['https'], defaultValue: 'https://openrouter.ai/api' }),
      })
    ),
  }),
  /**
   * Internal-only Deductive AI integration. `register` gates whether the built-in
   * `deductive.ai` agent and its Advanced Settings are registered at all. It is unset
   * (default `false`) on customer deployments, so they never see or expose the
   * integration. The runtime on/off switch is the `agentBuilder:deductiveEnabled`
   * Global Advanced Setting.
   */
  deductive: schema.maybe(
    schema.object({
      register: schema.boolean({ defaultValue: false }),
    })
  ),
});

export type AgentBuilderConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentBuilderConfig> = {
  schema: configSchema,
};
