/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentCard, AgentSkill, SecurityScheme } from '@a2a-js/sdk';
import type { AgentConfiguration, AgentDefinition } from '@kbn/agent-builder-common';
import { filterToolsBySelection } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderConfig } from '../../config';
import type { ToolsServiceStart } from '../../services/tools';
import { A2A_SERVER_PATH } from '../../routes/a2a';

type A2AOauth2Metadata = NonNullable<NonNullable<AgentBuilderConfig['a2a']>['oauth2']>['metadata'];

interface CreateAgentCardParams {
  agent: AgentDefinition;
  /** The agent's resolved effective configuration (type base merged under the agent config). */
  configuration: AgentConfiguration;
  baseUrl: string;
  toolsService: ToolsServiceStart;
  request: KibanaRequest;
  /** When present, the bearerAuth scheme uses OAuth2 with explicit flow URLs. */
  a2aOauth2Metadata?: A2AOauth2Metadata;
}

export function buildBearerAuthScheme(
  baseUrl: string,
  oauth2Metadata?: A2AOauth2Metadata
): SecurityScheme {
  if (oauth2Metadata) {
    const authServer = oauth2Metadata.authorization_servers[0];
    const scopes = Object.fromEntries(oauth2Metadata.scopes_supported.map((s) => [s, s]));
    return {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: `${authServer}/authorize`,
          tokenUrl: `${authServer}/token`,
          scopes,
        },
      },
    };
  }
  return {
    type: 'http',
    scheme: 'bearer',
    description: `OAuth 2.0 Bearer token. To discover the authorization server, fetch ${baseUrl}${A2A_SERVER_PATH}/.well-known/oauth-protected-resource`,
  };
}

export async function createAgentCard({
  agent,
  configuration,
  baseUrl,
  toolsService,
  request,
  a2aOauth2Metadata,
}: CreateAgentCardParams): Promise<AgentCard> {
  const registry = await toolsService.getRegistry({ request });
  const availableTools = await registry.list({});

  const selectedTools = filterToolsBySelection(availableTools, configuration.tools);

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
      apiKey: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Elastic API key (Authorization: ApiKey <encoded>)',
      },
      bearerAuth: buildBearerAuthScheme(baseUrl, a2aOauth2Metadata),
    },
    security: [{ bearerAuth: [] }, { apiKey: [] }],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills,
    supportsAuthenticatedExtendedCard: false,
  };
}
