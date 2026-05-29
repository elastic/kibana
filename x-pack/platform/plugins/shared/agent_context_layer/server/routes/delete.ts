/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlDeleteHttpResponse } from '../../common/http_api/sml';
import { smlByIdPath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, withSmlFeatureFlag } from './common';

export const registerDeleteRoute = ({
  router,
  coreSetup,
  logger,
  getSmlService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
  logger: Logger;
  getSmlService: () => SmlService;
}) => {
  router.delete(
    {
      path: smlByIdPath,
      validate: {
        params: schema.object({
          id: schema.string({ minLength: 1 }),
        }),
      },
      options: { access: 'internal' },
      security: WRITE_SECURITY,
    },
    withSmlFeatureFlag(async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { id } = request.params as { id: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const accessMap = await sml.checkItemsAccess({ ids: [id], spaceId, esClient, request });
        if (!accessMap.get(id)) {
          return response.notFound({ body: { message: `SML document '${id}' not found` } });
        }

        const deleted = await sml.deleteDocument({ id, spaceId, esClient });
        if (!deleted) {
          return response.notFound({ body: { message: `SML document '${id}' not found` } });
        }

        const body: SmlDeleteHttpResponse = { id, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`SML delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
