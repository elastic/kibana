/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import type { SmlSearchHttpResponse } from '../../../common/http_api/sml';

/** Max length of the search string (bounds request size and ES query payload). */
const SML_SEARCH_QUERY_MAX_LENGTH = 512;

export function registerInternalSmlRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/sml/_search`,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: 50 })),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { sml } = getInternalServices();
        const { query, size } = request.body;
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

        const searchResult = await sml.search({
          query,
          size,
          spaceId,
          esClient,
          request,
        });

        const body: SmlSearchHttpResponse = {
          total: searchResult.total,
          results: searchResult.results.map((hit) => ({
            chunk_id: hit.id,
            attachment_id: hit.origin_id,
            attachment_type: hit.type,
            title: hit.title,
            content: hit.content,
            score: hit.score,
          })),
        };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );
}
