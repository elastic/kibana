/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentCard, AgentSkill } from '@a2a-js/sdk';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { filterToolsBySelection } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolsServiceStart } from '../../services/tools';
import { A2A_SERVER_PATH } from '../../routes/a2a';

interface CreateAgentCardParams {
  agent: AgentDefinition;
  baseUrl: string;
  toolsService: ToolsServiceStart;
  request: KibanaRequest;
}

export async function createAgentCard({
  agent,
  baseUrl,
  toolsService,
  request,
}: CreateAgentCardParams): Promise<AgentCard> {
  const registry = await toolsService.getRegistry({ request });
  const availableTools = await registry.list({});

  const selectedTools = filterToolsBySelection(availableTools, agent.configuration.tools);

  const skills: AgentSkill[] = selectedTools.map((tool) => ({
    id: tool.id,
    name: tool.id,
    description: tool.description,
    tags: ['tool'],
    examples: [],
    inputModes: ['text/plain', 'application/json'],
    outputModes: ['text/plain', 'application/json'],
  }));

  return {
    name: agent.name,
    description: agent.description,
    url: `${baseUrl}${A2A_SERVER_PATH}/${agent.id}`,
    provider: {
      organization: 'Elastic',
      url: 'https://elastic.co',
    },
    version: '0.1.0',
    protocolVersion: '0.3.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    securitySchemes: {
      authorization: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Authentication token',
      },
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills,
    supportsAuthenticatedExtendedCard: false,
  };
}
