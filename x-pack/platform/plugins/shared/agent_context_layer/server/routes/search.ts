/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';
import type { SmlSearchHttpResponse } from '../../common/http_api/sml';
import { SML_HTTP_SEARCH_QUERY_MAX_LENGTH } from '../../common/http_api/sml';
import { smlSearchPath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';

const SML_SEARCH_SIZE_MAX = 1000;

const AGENT_CONTEXT_LAYER_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentContextLayer] },
};

export const registerSearchRoute = ({
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
  router.post(
    {
      path: smlSearchPath,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_SEARCH_SIZE_MAX })),
          skip_content: schema.maybe(schema.boolean()),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_CONTEXT_LAYER_READ_SECURITY,
    },
    async (ctx, request, response) => {
      try {
        const coreContext = await ctx.core;
        const uiSettingsClient = coreContext.uiSettings.client;

        const isEnabled = await uiSettingsClient.get<boolean>(
          AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isEnabled) {
          return response.notFound();
        }

        const sml = getSmlService();
        const { query, size, skip_content: skipContent } = request.body;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

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
      } catch (error) {
        logger.error(`SML search route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
