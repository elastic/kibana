/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CeDeleteHttpResponse } from '../../common/http_api/ce';
import { ceByIdPath } from '../../common/constants';
import type { CeService } from '../services/ce/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { WRITE_SECURITY, withCeFeatureFlag } from './common';

export const registerDeleteRoute = ({
  router,
  coreSetup,
  logger,
  getCeService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  logger: Logger;
  getCeService: () => CeService;
}) => {
  router.delete(
    {
      path: ceByIdPath,
      validate: {
        params: schema.object({
          id: schema.string({ minLength: 1 }),
        }),
      },
      options: { access: 'internal' },
      security: WRITE_SECURITY,
    },
    withCeFeatureFlag(async (ctx, request, response) => {
      try {
        const ce = getCeService();
        const { id } = request.params as { id: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const accessMap = await ce.checkItemsAccess({ ids: [id], spaceId, esClient, request });
        if (!accessMap.get(id)) {
          return response.notFound({ body: { message: `CE document '${id}' not found` } });
        }

        const deleted = await ce.deleteDocument({ id, spaceId, esClient });
        if (!deleted) {
          return response.notFound({ body: { message: `CE document '${id}' not found` } });
        }

        const body: CeDeleteHttpResponse = { id, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`CE delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
