/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderConfig } from '../config';

/**
 * Builds a complete AgentBuilderConfig for tests, matching the schema defaults.
 * Use this instead of inline literals so new config fields don't break every
 * test that mocks config.
 */
export const createMockConfig = (
  overrides: Partial<AgentBuilderConfig> = {}
): AgentBuilderConfig => ({
  enabled: true,
  githubBaseUrl: 'https://github.com',
  topSnippets: { numSnippets: 2, numWords: 750 },
  tracing: {
    exporters: [],
    scheduledDelay: 1000,
    opik_distributed_tracing: false,
  },
  opencodeSubagent: {
    kubeContext: 'kind-opencode-sandbox',
    namespace: 'opencode-sandbox',
    image: 'opencode-sandbox:0.1',
    mcpUrl: 'http://host.docker.internal:5610/api/agent_builder/mcp',
    elasticsearchUrl: 'http://host.docker.internal:9200',
    litellm: {
      baseUrl: 'https://elastic.litellm-prod.ai/v1',
      orchestratorModel: 'llm-gateway/claude-sonnet-4-6',
      coderModel: 'llm-gateway/gpt-5.3-codex',
    },
    maxRunSeconds: 1800,
  },
  ...overrides,
});
