/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { agentBuilderDefaultAgentId, type AgentDefinition } from '@kbn/agent-builder-common';
import {
  appendProductDocumentationTool,
  isProductDocumentationToolSelected,
} from './append_product_documentation_tool';

const AGENT_BUILDER_AGENTS_API = '/api/agent_builder/agents';

export const enableProductDocumentationToolOnDefaultAgent = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<void> => {
  const agentId = agentBuilderDefaultAgentId;
  const agent = await http.get<AgentDefinition>(
    `${AGENT_BUILDER_AGENTS_API}/${encodeURIComponent(agentId)}`
  );

  const currentTools = agent.configuration?.tools ?? [];
  if (isProductDocumentationToolSelected(currentTools)) {
    return;
  }

  const mergedTools = appendProductDocumentationTool(currentTools);
  await http.put(`${AGENT_BUILDER_AGENTS_API}/${encodeURIComponent(agentId)}`, {
    body: JSON.stringify({
      configuration: {
        tools: mergedTools,
      },
    }),
  });
};
