/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type {
  ContextEngineSearchHttpResponse,
  ContextEngineSearchHttpResultItem,
} from '../../common/http_api/context_engine';
import {
  CONTEXT_ENGINE_HTTP_SEARCH_QUERY_MAX_LENGTH,
  ContextEngineSearchFilterType,
} from '../../common/http_api/context_engine';
import { contextEngineSearchPath } from '../../common/constants';
import type { ContextEngineService } from '../services/engine/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import {
  ContextEngineAuthzEnumerationIncompleteError,
  ContextEngineCorpusTooLargeError,
} from '../services/engine/errors';
import { READ_SECURITY, withContextEngineFeatureFlag } from './common';

const CONTEXT_ENGINE_SEARCH_SIZE_MAX = 1000;
const CONTEXT_ENGINE_SEARCH_FILTER_ARRAY_MAX = 100;

export const registerSearchRoute = ({
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
  router.post(
    {
      path: contextEngineSearchPath,
      validate: {
        body: schema.object({
          query: schema.string({
            minLength: 1,
            maxLength: CONTEXT_ENGINE_HTTP_SEARCH_QUERY_MAX_LENGTH,
          }),
          size: schema.maybe(schema.number({ min: 1, max: CONTEXT_ENGINE_SEARCH_SIZE_MAX })),
          // Runtime-imposed per-type id-allowlist (e.g. agent-centric connector
          // allow-list). Renamed from `filters` to `constraints` to make the trust
          // boundary explicit alongside the agent-discoverable `filters`.
          constraints: schema.maybe(
            schema.recordOf(
              schema.literal(ContextEngineSearchFilterType.connector),
              schema.object({
                ids: schema.maybe(
                  schema.arrayOf(schema.string({ maxLength: 100 }), {
                    maxSize: CONTEXT_ENGINE_SEARCH_FILTER_ARRAY_MAX,
                  })
                ),
              })
            )
          ),
          // Agent-discoverable filters: refinements the LLM tool path supplies.
          // ANDed with `constraints`; agent filters cannot widen runtime scope.
          filters: schema.maybe(
            schema.object({
              types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), {
                  maxSize: CONTEXT_ENGINE_SEARCH_FILTER_ARRAY_MAX,
                })
              ),
              tags: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), {
                  maxSize: CONTEXT_ENGINE_SEARCH_FILTER_ARRAY_MAX,
                })
              ),
            })
          ),
          fields: schema.maybe(
            schema.arrayOf(
              schema.oneOf([
                schema.literal('content'),
                schema.literal('description'),
                schema.literal('tags'),
                schema.literal('references'),
                schema.literal('spaces'),
                schema.literal('permissions'),
              ]),
              { maxSize: 6 }
            )
          ),
        }),
      },
      options: { access: 'internal' },
      security: READ_SECURITY,
    },
    withContextEngineFeatureFlag(async (ctx, request, response) => {
      try {
        const contextEngine = getContextEngineService();
        const coreContext = await ctx.core;
        const { query, size, fields, constraints, filters } = request.body;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const { results } = await contextEngine.search({
          query,
          size,
          fields,
          spaceId,
          esClient,
          request,
          constraints,
          filters,
        });

        const body: ContextEngineSearchHttpResponse = {
          results: results.map((hit) => {
            const item: ContextEngineSearchHttpResultItem = {
              id: hit.id,
              type: hit.type,
              origin: hit.origin,
              title: hit.title,
            };
            if (hit.content !== undefined) item.content = hit.content;
            if (hit.description !== undefined) item.description = hit.description;
            if (hit.references !== undefined) item.references = hit.references;
            if (hit.tags !== undefined) item.tags = hit.tags;
            return item;
          }),
        };

        return response.ok({ body });
      } catch (error) {
        // Pre-aggregation fail-closed conditions: a partial permission-universe
        // enumeration (transient ES error) or a corpus too large to enumerate
        // safely. Both mean we cannot guarantee a correctly-authorized result
        // set right now, so surface 503 rather than risk over-disclosure.
        if (
          error instanceof ContextEngineAuthzEnumerationIncompleteError ||
          error instanceof ContextEngineCorpusTooLargeError
        ) {
          logger.warn(`Context Engine search authorization unavailable: ${error.message}`);
          return response.customError({
            statusCode: 503,
            body: { message: error.message },
          });
        }
        logger.error(`Context Engine search route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
