/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { isElasticConsoleEnabled } from './is_enabled';

export const registerModelsRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.get(
    {
      path: '/internal/elastic_ramen/v1/models',
      security: {
        authz: { enabled: false, reason: 'This route delegates to the inference plugin' },
      },
      options: {
        access: 'internal',
      },
      validate: {},
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { inference }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const connectors = await inference.getConnectorList(request);

        const models = connectors.map((connector) => ({
          id: connector.connectorId,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: connector.type,
          permission: [],
          root: connector.connectorId,
          parent: null,
        }));

        return response.ok({
          body: {
            object: 'list',
            data: models,
          },
        });
      } catch (error) {
        logger.error(`Models listing error: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: error.message,
          },
        });
      }
    }
  );
};
