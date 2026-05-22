/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlUpsertHttpResponse } from '../../common/http_api/sml';
import { smlByIdPath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, toSmlHttpItem, withSmlFeatureFlag } from './common';

export const registerUpsertRoute = ({
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
  router.put(
    {
      path: smlByIdPath,
      validate: {
        params: schema.object({
          id: schema.string({ minLength: 1 }),
        }),
        // TODO: Add maxLength bounds to string fields (type, title, origin_id, content) to
        // prevent abuse with excessively long values.
        body: schema.object({
          type: schema.string({ minLength: 1 }),
          title: schema.string({ minLength: 1 }),
          origin_id: schema.string({ minLength: 1 }),
          content: schema.string(),
          permissions: schema.maybe(
            schema.arrayOf(schema.string({ minLength: 1 }), { maxSize: 100 })
          ),
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

        const result = await sml.upsertDocument({
          id,
          spaceId,
          document: request.body as {
            type: string;
            title: string;
            origin_id: string;
            content: string;
            permissions?: string[];
          },
          esClient,
        });
        if (!result) {
          return response.notFound({ body: { message: `SML document '${id}' not found` } });
        }

        const body: SmlUpsertHttpResponse = {
          item: toSmlHttpItem(result.document),
          created: result.created,
        };

        return response.ok({ body });
      } catch (error) {
        logger.error(`SML upsert route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
