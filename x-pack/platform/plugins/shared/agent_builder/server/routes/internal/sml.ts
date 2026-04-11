/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { pick } from 'lodash';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import {
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  type SmlSearchHttpResponse,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';

/** Max page size for SML HTTP search (separate from default UI size). */
const SML_SEARCH_SIZE_MAX = 1000;

/** Fields exposed on `SmlSearchHttpResponse.results` (subset of `SmlSearchResult`). */
const SML_SEARCH_HTTP_RESULT_KEYS = [
  'id',
  'type',
  'origin_id',
  'title',
  'score',
  'content',
] as const;

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
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_SEARCH_SIZE_MAX })),
          skip_content: schema.maybe(schema.boolean()),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { sml } = getInternalServices();
        const { query, size, skip_content: skipContent } = request.body;
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

        const { results, total } = await sml.search({
          query,
          size,
          spaceId,
          esClient,
          request,
          skipContent,
        });

        const body: SmlSearchHttpResponse = {
          total,
          results: results.map((hit) => pick(hit, ...SML_SEARCH_HTTP_RESULT_KEYS)),
        };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );
}
