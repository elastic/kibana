/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { toolToDescriptor } from '../services/tools/utils/tool_conversion';
import type { ListToolsResponse } from '../../common/http_api/tools';
import { apiPrivileges } from '../../common/features';

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/api/chat/tools/_execute',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        body: schema.object({
          toolId: schema.string({}),
          params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { toolId, params } = request.body;
      const { tools: toolService } = getInternalServices();
      const registry = toolService.registry.asScopedPublicRegistry({ request });
      const tool = await registry.get(toolId);

      const validation = tool.schema.safeParse(params);
      if (validation.error) {
        return response.badRequest({
          body: {
            message: `invalid parameters: ${validation.error.message}`,
          },
        });
      }

      const toolResult = await tool.execute({ toolParams: params });

      return response.ok({
        body: {
          result: toolResult.result,
        },
      });
    })
  );

  router.post(
    {
      path: '/internal/onechat/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const registry = toolService.registry.asScopedPublicRegistry({ request });
      const tools = await registry.list({});
      return response.ok<ListToolsResponse>({
        body: {
          tools: tools.map(toolToDescriptor),
        },
      });
    })
  );
}
