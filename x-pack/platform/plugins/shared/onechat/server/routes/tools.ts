/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { toolToDescriptor } from '../services/tools/utils/tool_conversion';

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/api/onechat/tools/list',
      security: {
        authz: {
          enabled: false,
          reason: 'Platform feature - RBAC in lower layers',
        },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const registry = toolService.registry.asScopedPublicRegistry({ request });
      const tools = await registry.list({});
      return response.ok({
        body: {
          tools: tools.map(toolToDescriptor),
        },
      });
    })
  );
}
