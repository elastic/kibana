/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlGetHttpResponse } from '../../common/http_api/sml';
import { smlByOriginIdPath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { READ_SECURITY, toSmlHttpItem, withSmlFeatureFlag } from './common';

/**
 * `GET /internal/agent_context_layer/sml/{originId}`
 *
 * Returns every chunk written under the given `origin_id` that is
 * visible from the caller's space. The crawler and the workflow step's
 * content mode can both produce multiple chunks per origin, so the
 * response is an array — consumers iterate without ordering
 * assumptions.
 *
 * Per-chunk permission filtering: chunks the caller is not authorized
 * to access (per their Kibana feature privileges) are dropped from the
 * result. An empty post-filter result is reported as 404 to avoid
 * disclosing existence of chunks the user cannot see.
 */
export const registerGetRoute = ({
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
  router.get(
    {
      path: smlByOriginIdPath,
      validate: {
        params: schema.object({
          originId: schema.string({ minLength: 1 }),
        }),
      },
      options: { access: 'internal' },
      security: READ_SECURITY,
    },
    withSmlFeatureFlag(async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { originId } = request.params as { originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const docs = await sml.findByOriginId({ originId, spaceId, esClient });
        if (docs.length === 0) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        const accessMap = await sml.checkItemsAccess({
          ids: docs.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const authorized = docs.filter((d) => accessMap.get(d.id) === true);
        if (authorized.length === 0) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        const body: SmlGetHttpResponse = { items: authorized.map(toSmlHttpItem) };
        return response.ok({ body });
      } catch (error) {
        logger.error(`SML get route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
