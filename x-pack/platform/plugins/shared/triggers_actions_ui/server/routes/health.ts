/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';

type TriggersActionsUiRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
}>;

export function createHealthRoute(
  logger: Logger,
  router: IRouter<TriggersActionsUiRequestHandlerContext>,
  baseRoute: string,
  isAlertsAvailable: boolean
) {
  const path = `${baseRoute}/_health`;
  logger.debug(`registering triggers_actions_ui health route GET ${path}`);
  router.get(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization as the health route does not require any.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    handler
  );
  async function handler(
    ctx: TriggersActionsUiRequestHandlerContext,
    req: KibanaRequest<unknown, unknown, unknown>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const actionsContext = await ctx.actions;
    const skippedIds = actionsContext.getSkippedPreconfiguredConnectorIds();
    const result = {
      isAlertsAvailable,
      skippedPreconfiguredConnectorIds: Array.from(skippedIds),
    };

    logger.debug(() => `route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}
