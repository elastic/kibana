/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { internalApiPath } from '../../common/constants';
import {
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  type SmlSearchHttpResponse,
} from '../../common/http_api/sml';
import { apiPrivileges } from '../../common/features';
import type { SmlService } from '../services/sml';
import type { SemanticLayerPluginStart, SemanticLayerStartDependencies } from '../types';

const SML_SEARCH_SIZE_MAX = 1000;

const SEMANTIC_LAYER_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readSemanticLayer] },
};

export const registerSearchRoute = ({
  router,
  logger,
  coreSetup,
  getSmlService,
}: {
  router: IRouter;
  logger: Logger;
  coreSetup: CoreSetup<SemanticLayerStartDependencies, SemanticLayerPluginStart>;
  getSmlService: () => SmlService;
}) => {
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
      security: SEMANTIC_LAYER_READ_SECURITY,
    },
    async (ctx, request, response) => {
      const { uiSettings } = await ctx.core;
      const enabled = await uiSettings.client.get(SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID);
      if (!enabled) {
        return response.notFound();
      }

      const sml = getSmlService();
      const { query, size, skip_content: skipContent } = request.body;
      const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
      const [, startDeps] = await coreSetup.getStartServices();
      const spaceId =
        (startDeps as unknown as { spaces?: SpacesPluginStart }).spaces?.spacesService?.getSpaceId(
          request
        ) ?? 'default';

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
        results: results.map(({ id, type, origin_id, title, score, content }) => ({
          id,
          type,
          origin_id,
          title,
          score,
          ...(skipContent ? {} : { content }),
        })),
      };

      return response.ok({ body });
    }
  );
};
