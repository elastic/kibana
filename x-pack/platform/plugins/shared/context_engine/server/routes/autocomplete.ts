/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type {
  ContextEngineAutocompleteHttpResponse,
  ContextEngineAutocompleteHttpResultItem,
} from '../../common/http_api/context_engine';
import {
  CONTEXT_ENGINE_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
  ContextEngineSearchFilterType,
} from '../../common/http_api/context_engine';
import { contextEngineAutocompletePath } from '../../common/constants';
import type { ContextEngineService } from '../services/context_engine/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { READ_SECURITY, withContextEngineFeatureFlag } from './common';

const CONTEXT_ENGINE_AUTOCOMPLETE_SIZE_MAX = 50;

export const registerAutocompleteRoute = ({
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
      path: contextEngineAutocompletePath,
      validate: {
        body: schema.object({
          query: schema.string({
            minLength: 1,
            maxLength: CONTEXT_ENGINE_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
          }),
          size: schema.maybe(schema.number({ min: 1, max: CONTEXT_ENGINE_AUTOCOMPLETE_SIZE_MAX })),
          // Runtime-imposed per-type constraints (e.g. agent-centric connector
          // allow-list). Same shape as the `constraints` field on POST /sml/_search
          // so a single FE scope-builder can feed either route.
          constraints: schema.maybe(
            schema.recordOf(
              schema.literal(ContextEngineSearchFilterType.connector),
              schema.object({
                ids: schema.maybe(
                  schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })
                ),
              })
            )
          ),
          // Caller-supplied type/tag refinements — same shape as on POST /sml/_search.
          // Useful for specialized UI pickers (e.g. connectors-only @ menu).
          filters: schema.maybe(
            schema.object({
              types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), { maxSize: 100 })
              ),
              tags: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), { maxSize: 100 })
              ),
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
        const { query, size, constraints, filters } = request.body;
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const { results } = await contextEngine.autocomplete({
          query,
          size,
          spaceId,
          esClient,
          request,
          constraints,
          filters,
        });

        const body: ContextEngineAutocompleteHttpResponse = {
          results: results.map(
            ({
              id,
              type,
              origin,
              title,
              matched_discovery_labels,
            }): ContextEngineAutocompleteHttpResultItem => ({
              id,
              type,
              origin,
              title,
              matched_discovery_labels: matched_discovery_labels ?? [],
            })
          ),
        };

        return response.ok({ body });
      } catch (error) {
        logger.error(`Context Engine autocomplete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
