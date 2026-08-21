/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import path from 'node:path';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { KibanaA2AAdapter } from '../utils/a2a/kibana_a2a_adapter';
import { getKibanaUrl } from '../utils/get_kibana_url';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';

export const A2A_SERVER_PATH = `${publicApiPath}/a2a`;

export function registerA2ARoutes({
  router,
  config,
  getInternalServices,
  coreSetup,
  logger,
  pluginsSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const getBaseUrl = async (request: KibanaRequest) => {
    return getKibanaUrl(coreSetup, pluginsSetup.cloud, request);
  };

  const a2aAdapter = new KibanaA2AAdapter(
    logger,
    getInternalServices,
    getBaseUrl,
    config.a2a?.oauth2?.metadata
  );

  router.versioned
    .get({
      path: `${A2A_SERVER_PATH}/{agentId}.json`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get A2A agent card',
      description:
        'Get agent discovery metadata in JSON format. Use this endpoint to provide agent information for A2A protocol integration and discovery. To learn more about the Agent Builder A2A server, refer to the [A2A server documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server).',
      options: {
        tags: ['a2a', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              agentId: schema.string({
                meta: {
                  description: 'The unique identifier of the agent to get A2A metadata for.',
                },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/a2a_agent_card.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        return await a2aAdapter.handleAgentCardRequest(request, response, request.params.agentId);
      })
    );

  router.versioned
    .post({
      path: `${A2A_SERVER_PATH}/{agentId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send A2A task',
      description: `> warn
> This endpoint is designed for A2A protocol clients and should not be used directly via REST APIs. Use an A2A SDK or A2A Inspector instead.
To learn more about the Agent Builder A2A server, refer to the [A2A server documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server).`,
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: [
          'a2a',
          'oas-tag:agent builder',
          'security:acceptUiamOAuth',
          ...(config.a2a?.oauth2
            ? [
                `security:resourceMetadataPath=${A2A_SERVER_PATH}/.well-known/oauth-protected-resource`,
              ]
            : []),
        ],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              agentId: schema.string({
                meta: {
                  description: 'The unique identifier of the agent to send the A2A task to.',
                },
              }),
            }),
            body: schema.object(
              {},
              {
                unknowns: 'allow',
                meta: { description: 'JSON-RPC 2.0 request payload for A2A communication.' },
              }
            ),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/a2a_task.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agentId } = request.params;
        return await a2aAdapter.handleA2ARequest(request, response, agentId);
      })
    );

  if (config.a2a?.oauth2) {
    const { metadata } = config.a2a.oauth2;
    const oauthMetadataBody: Record<string, unknown> = {
      resource: metadata.resource,
      authorization_servers: metadata.authorization_servers,
      scopes_supported: metadata.scopes_supported,
      bearer_methods_supported: metadata.bearer_methods_supported,
      ...(metadata.resource_documentation
        ? { resource_documentation: metadata.resource_documentation }
        : {}),
    };
    const oauthReason =
      'This endpoint must be publicly accessible for A2A OAuth 2.0 protected resource discovery.';
    const oauthSecurityConfig = {
      authc: { enabled: false as const, reason: oauthReason },
      authz: { enabled: false as const, reason: oauthReason },
    };

    // A2A-specific PRM endpoint (RFC 9728), served under the A2A path.
    router.get(
      {
        path: `${A2A_SERVER_PATH}/.well-known/oauth-protected-resource`,
        security: oauthSecurityConfig,
        options: { access: 'public' },
        validate: false,
      },
      (_context, _request, response) => {
        return response.ok({
          body: oauthMetadataBody,
          headers: { 'content-type': 'application/json' },
        });
      }
    );

    // Path-aware PRM discovery (RFC 9728 §2.1): MCP/A2A clients try
    // /.well-known/oauth-protected-resource<server-path> before falling back to the root.
    // The security plugin's catch-all for this pattern returns the MCP resource, so we
    // register a more-specific route here that wins by Hapi's longest-literal-prefix rule.
    router.get(
      {
        path: `/.well-known/oauth-protected-resource${A2A_SERVER_PATH}`,
        security: oauthSecurityConfig,
        options: { access: 'public' },
        validate: false,
      },
      (_context, _request, response) => {
        return response.ok({
          body: oauthMetadataBody,
          headers: { 'content-type': 'application/json' },
        });
      }
    );
  }

  const discoveryReason = 'This endpoint must be publicly accessible for A2A agent card discovery.';
  router.get(
    {
      path: `${A2A_SERVER_PATH}/.well-known/agent-card.json`,
      security: {
        authc: { enabled: false as const, reason: discoveryReason },
        authz: { enabled: false as const, reason: discoveryReason },
      },
      options: { access: 'public' },
      validate: false,
    },
    (_context, request, response) => {
      return a2aAdapter.handleDefaultAgentCardRequest(request, response);
    }
  );
}
