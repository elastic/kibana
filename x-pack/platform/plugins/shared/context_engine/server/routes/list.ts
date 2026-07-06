/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ContextEngineListHttpResponse } from '../../common/http_api/context_engine';
import {
  CONTEXT_ENGINE_HTTP_LIST_PAGE_DEFAULT,
  CONTEXT_ENGINE_HTTP_LIST_PER_PAGE_DEFAULT,
  CONTEXT_ENGINE_HTTP_LIST_PER_PAGE_MAX,
} from '../../common/http_api/context_engine';
import { contextEngineBasePath } from '../../common/constants';
import type { ContextEngineService } from '../services/context_engine/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { READ_SECURITY, toContextEngineHttpItem, withContextEngineFeatureFlag } from './common';
import { ContextEngineResultWindowExceededError } from '../services/context_engine/errors';

export const registerListRoute = ({
  router,
  coreSetup,
  logger,
  getContextEngineService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  logger: Logger;
  getContextEngineService: () => ContextEngineService;
}) => {
  router.get(
    {
      path: contextEngineBasePath,
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: CONTEXT_ENGINE_HTTP_LIST_PAGE_DEFAULT, min: 1 }),
          per_page: schema.number({
            defaultValue: CONTEXT_ENGINE_HTTP_LIST_PER_PAGE_DEFAULT,
            min: 1,
            max: CONTEXT_ENGINE_HTTP_LIST_PER_PAGE_MAX,
          }),
          type: schema.maybe(schema.string({ minLength: 1 })),
          origin_uri: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          tags: schema.maybe(
            schema.string({
              maxLength: 2000,
              meta: {
                description:
                  'Comma-delimited list of tags to filter by (OR semantics — returns documents matching any supplied tag). Tag values must be lowercase alphanumeric with optional hyphens or underscores. Example: `?tags=otel,my-tag`.',
              },
            })
          ),
        }),
      },
      options: { access: 'internal' },
      security: READ_SECURITY,
    },
    withContextEngineFeatureFlag(async (ctx, request, response) => {
      try {
        const contextEngine = getContextEngineService();
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

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const tags = tagsParam
          ? tagsParam
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;

        const { results } = await contextEngine.listDocuments({
          spaceId,
          esClient,
          page,
          perPage,
          type,
          originUri,
          tags,
        });

        // TODO: Push permission filtering into the ES query for accurate pagination.
        let filteredResults = results;
        if (results.length > 0) {
          const ids = results.map((r) => r.id);
          const accessMap = await contextEngine.checkItemsAccess({
            ids,
            spaceId,
            esClient,
            request,
          });
          filteredResults = results.filter((r) => accessMap.get(r.id) !== false);
        }

        const body: ContextEngineListHttpResponse = {
          page,
          per_page: perPage,
          items: filteredResults.map(toContextEngineHttpItem),
        };

        return response.ok({ body });
      } catch (error) {
        if (error instanceof ContextEngineResultWindowExceededError) {
          return response.badRequest({ body: { message: error.message } });
        }
        logger.error(`Context Engine list route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
