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
  // Experimental OpenCode coding sub-agent. Delegates coding tasks to a
  // sandboxed OpenCode agent driven over ACP inside a Kubernetes pod. This is a
  // PoC: settings describe how to reach the local `kind` sandbox and the model
  // gateway. Gated additionally by the opencodeSubagent UI setting.
  opencodeSubagent: schema.object({
    // How the executor reaches the sandbox. `kubectl` uses the k8s exec
    // subresource to drive `opencode acp` over stdio inside a pod.
    kubeContext: schema.string({ defaultValue: 'kind-opencode-sandbox' }),
    namespace: schema.string({ defaultValue: 'opencode-sandbox' }),
    image: schema.string({ defaultValue: 'opencode-sandbox:0.1' }),
    // URL the sandbox pod uses to reach this Kibana's Agent Builder MCP server.
    // From inside a kind pod on Docker Desktop this is the host gateway.
    mcpUrl: schema.string({
      defaultValue: 'http://host.docker.internal:5610/api/agent_builder/mcp',
    }),
    // URL the sandbox pod uses for direct Elasticsearch access through the
    // Elastic CLI. From inside a kind pod on Docker Desktop this is the host
    // gateway.
    elasticsearchUrl: schema.maybe(
      schema.string({ defaultValue: 'http://host.docker.internal:9200' })
    ),
    // Model gateway (LiteLLM) the sandboxed OpenCode talks to.
    litellm: schema.object({
      baseUrl: schema.string({ defaultValue: 'https://elastic.litellm-prod.ai/v1' }),
      apiKey: schema.maybe(schema.string()),
      orchestratorModel: schema.string({ defaultValue: 'llm-gateway/claude-sonnet-4-6' }),
      coderModel: schema.string({ defaultValue: 'llm-gateway/gpt-5.3-codex' }),
    }),
    // Hard ceiling on a single sub-agent run before the pod is force-deleted.
    maxRunSeconds: schema.number({ defaultValue: 1800, min: 60 }),
  }),
});

export type AgentBuilderConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentBuilderConfig> = {
  schema: configSchema,
};
