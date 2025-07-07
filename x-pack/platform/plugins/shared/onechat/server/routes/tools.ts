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
import { ONECHAT_TOOLS_UI_SETTING_ID } from '../../common/constants';

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

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

  router.versioned
    .post({
      path: '/api/chat/tools/_execute',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Execute a Tool',
      options: {
        tags: ['tools'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              id: schema.string({}),
              params: schema.recordOf(schema.string(), schema.any()),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { uiSettings } = await ctx.core;
        const enabled = await uiSettings.client.get(ONECHAT_TOOLS_UI_SETTING_ID);

        if (!enabled) {
          return response.notFound();
        }
        const { id, params } = request.body;
        const { tools: toolService } = getInternalServices();
        const registry = toolService.registry.asScopedPublicRegistry({ request });
        const tool = await registry.get(id);

        const validation = tool.schema.safeParse(params);
        if (validation.error) {
          return response.badRequest({
            body: {
              message: `Invalid parameters: ${validation.error.message}`,
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
}
