/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { smlListPath } from '../../../common/constants';
import {
  SML_HTTP_LIST_PAGE_DEFAULT,
  SML_HTTP_LIST_PER_PAGE_DEFAULT,
  SML_HTTP_LIST_PER_PAGE_MAX,
  type SmlListHttpResponse,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { SmlResultWindowExceededError } from '../../services/sml/sml_result_window_exceeded_error';
import { toSmlHttpItem } from './sml_common';

export function registerInternalSmlListRoute({ router, logger, coreSetup }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: smlListPath,
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: SML_HTTP_LIST_PAGE_DEFAULT, min: 1 }),
          per_page: schema.number({
            defaultValue: SML_HTTP_LIST_PER_PAGE_DEFAULT,
            min: 1,
            max: SML_HTTP_LIST_PER_PAGE_MAX,
          }),
          type: schema.maybe(schema.string({ minLength: 1 })),
          origin_uri: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          tags: schema.maybe(
            schema.string({
              maxLength: 2000,
              meta: {
                description:
                  'Comma-delimited list of tags to filter by (OR semantics). Example: `?tags=otel,my-tag`.',
              },
            })
          ),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        try {
          const [, , selfStart] = await coreSetup.getStartServices();
          const { smlService } = selfStart;
          const {
            page,
            per_page: perPage,
            type,
            origin_uri: originUri,
            tags: tagsParam,
          } = request.query as {
            page: number;
            per_page: number;
            type?: string;
            origin_uri?: string;
            tags?: string;
          };
          const coreContext = await ctx.core;
          const esClient = coreContext.elasticsearch.client;
          const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

          const tags = tagsParam
            ? tagsParam
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined;

          const { results } = await smlService.listDocuments({
            spaceId,
            esClient,
            page,
            perPage,
            type,
            originUri,
            tags,
          });

          let filteredResults = results;
          if (results.length > 0) {
            const ids = results.map((r) => r.id);
            const accessMap = await smlService.checkItemsAccess({
              ids,
              spaceId,
              esClient,
              request,
            });
            filteredResults = results.filter((r) => accessMap.get(r.id) !== false);
          }

          const body: SmlListHttpResponse = {
            page,
            per_page: perPage,
            items: filteredResults.map(toSmlHttpItem),
          };

          return response.ok({ body });
        } catch (error) {
          if (error instanceof SmlResultWindowExceededError) {
            return response.badRequest({ body: { message: (error as Error).message } });
          }
          logger.error(`SML list route error: ${(error as Error).message}`);
          throw error;
        }
      },
      {
        featureFlag: [
          AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
          CONTEXT_ENGINE_ENABLED_SETTING_ID,
        ],
      }
    )
  );
}
