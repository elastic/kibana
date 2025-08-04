/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/onechat-common';
import type { AgentCard, Skill } from '../types/a2a';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolsServiceStart } from '../services/tools';

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
  // Get available tools for this agent
  const registry = await toolsService.getRegistry({ request });
  const availableTools = await registry.list({});

  // Create skills based on agent's tools and capabilities
  const skills: Skill[] = [];

  // Primary chat skill
  skills.push({
    id: 'general_chat',
    name: 'General Chat',
    description: agent.description || 'General conversational assistance and task completion',
    tags: ['chat', 'assistance', 'general'],
    examples: [
      'Answer questions about any topic',
      'Help with analysis and reasoning',
      'Provide explanations and insights',
      'Assist with problem-solving',
    ],
    inputModes: ['text/plain'],
    outputModes: ['text/plain'],
  });

  // Add tool-specific skills based on available tools
  const agentToolIds = new Set(
    agent.configuration.tools.flatMap((selection) => selection.tool_ids || [])
  );

  for (const tool of availableTools) {
    if (agentToolIds.has(tool.id) || agentToolIds.has('*')) {
      skills.push({
        id: tool.id,
        name: tool.displayName || tool.id,
        description: tool.description,
        tags: ['tool', tool.id],
        examples: [],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/plain', 'application/json'],
      });
    }
  }

  const agentCard: AgentCard = {
    name: agent.name,
    description: agent.description,
    url: `${baseUrl}/api/chat/a2a`,
    provider: {
      organization: 'Elastic',
      url: 'https://elastic.co',
    },
    version: '1.0.0',
    capabilities: {
      streaming: false, // Not implementing streaming initially
      pushNotifications: false, // Not implementing push notifications
      stateTransitionHistory: true, // We support task history
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Kibana authentication token',
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills,
    supportsAuthenticatedExtendedCard: false,
  };

  return agentCard;
}
