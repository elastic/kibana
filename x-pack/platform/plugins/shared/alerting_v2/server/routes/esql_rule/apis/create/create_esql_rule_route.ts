/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import {
  createEsqlRule,
  createEsqlRuleDataSchema,
} from '../../../../application/esql_rule/methods/create';
import {
  createAPIKey,
  getAuthenticationAPIKey,
  isAuthenticationTypeAPIKey,
} from '../../../../application/esql_rule/lib/api_key';
import {
  getEsqlRuleRouteContext,
  INTERNAL_ESQL_RULE_API_PATH,
} from '../../lib/get_esql_route_context';
import { DEFAULT_ALERTING_V2_ROUTE_SECURITY } from '../../../constants';

const createEsqlRuleParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

export function createEsqlRuleRoute({
  router,
  logger,
  coreStartServices,
}: {
  router: IRouter;
  logger: Logger;
  coreStartServices: Promise<
    [
      CoreStart,
      {
        taskManager: TaskManagerStartContract;
        spaces: SpacesPluginStart;
        encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
        security?: SecurityPluginStart;
      },
      unknown
    ]
  >;
}) {
  router.post(
    {
      path: `${INTERNAL_ESQL_RULE_API_PATH}/{id?}`,
      security: DEFAULT_ALERTING_V2_ROUTE_SECURITY,
      options: { access: 'internal', tags: ['access:alerting'] },
      validate: {
        request: {
          body: createEsqlRuleDataSchema,
          params: createEsqlRuleParamsSchema,
        },
      },
    },
    async (_context, req, res) => {
      try {
        const [coreStart, pluginsStart] = await coreStartServices;
        const routeContext = getEsqlRuleRouteContext({
          coreStart,
          pluginsStart,
          request: req,
          logger,
        });

        const created = await createEsqlRule(
          {
            logger,
            request: req,
            taskManager: pluginsStart.taskManager,
            savedObjectsClient: routeContext.savedObjectsClient,
            spaceId: routeContext.spaceId,
            namespace: routeContext.namespace,
            getUserName: routeContext.getUserName,
            isAuthenticationTypeAPIKey: () =>
              isAuthenticationTypeAPIKey(routeContext.security, req),
            getAuthenticationAPIKey: (name: string) => getAuthenticationAPIKey(req, name),
            createAPIKey: (name: string) =>
              createAPIKey({ security: routeContext.security, request: req, name }),
          },
          { data: req.body, options: { id: req.params.id } }
        );

        return res.ok({ body: created });
      } catch (e) {
        const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
        logger.debug(`create esql rule route error: ${boom.message}`);
        return res.customError({ statusCode: boom.output.statusCode, body: boom.output.payload });
      }
    }
  );
}
