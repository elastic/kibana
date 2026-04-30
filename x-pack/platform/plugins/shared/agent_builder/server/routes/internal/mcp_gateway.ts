/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  GetMcpGatewayConfigResponse,
  UpdateMcpGatewayConfigResponse,
} from '../../../common/http_api/mcp_gateway';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from '../route_security';

const connectorConfigSchema = schema.object({
  connectorId: schema.string({ minLength: 1 }),
  connectorSlug: schema.string({ minLength: 1 }),
  enabled: schema.boolean(),
});

const gatewayConfigSchema = schema.object({
  enabled: schema.boolean(),
  connectors: schema.arrayOf(connectorConfigSchema),
});

export function registerInternalMcpGatewayRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: `${internalApiPath}/mcp_gateway/config`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { mcpGateway } = getInternalServices();
      const agentBuilderCtx = await ctx.agentBuilder;
      const spaceId = agentBuilderCtx.spaces.getSpaceId();

      const config = await mcpGateway.getConfig(spaceId);
      return response.ok<GetMcpGatewayConfigResponse>({ body: { config } });
    })
  );

  router.put(
    {
      path: `${internalApiPath}/mcp_gateway/config`,
      validate: {
        body: schema.object({ config: gatewayConfigSchema }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { mcpGateway } = getInternalServices();
      const agentBuilderCtx = await ctx.agentBuilder;
      const spaceId = agentBuilderCtx.spaces.getSpaceId();

      await mcpGateway.updateConfig(spaceId, request.body.config);
      const config = await mcpGateway.getConfig(spaceId);
      return response.ok<UpdateMcpGatewayConfigResponse>({ body: { config } });
    })
  );
}
