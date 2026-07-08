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
import { SmlSearchFilterType } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { smlSearchPath } from '../../../common/constants';
import {
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  type SmlSearchHttpResponse,
  type SmlSearchHttpResultItem,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { SmlAuthzEnumerationIncompleteError } from '../../services/sml/sml_authz_enumeration_incomplete_error';
import { SmlCorpusTooLargeError } from '../../services/sml/sml_corpus_too_large_error';

const SML_SEARCH_SIZE_MAX = 1000;
const SML_SEARCH_FILTER_ARRAY_MAX = 100;

export function registerInternalSmlSearchRoute({ router, logger, coreSetup }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: smlSearchPath,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_SEARCH_SIZE_MAX })),
          constraints: schema.maybe(
            schema.recordOf(
              schema.literal(SmlSearchFilterType.connector),
              schema.object({
                ids: schema.maybe(
                  schema.arrayOf(schema.string({ maxLength: 100 }), {
                    maxSize: SML_SEARCH_FILTER_ARRAY_MAX,
                  })
                ),
              })
            )
          ),
          filters: schema.maybe(
            schema.object({
              types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), {
                  maxSize: SML_SEARCH_FILTER_ARRAY_MAX,
                })
              ),
              tags: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), {
                  maxSize: SML_SEARCH_FILTER_ARRAY_MAX,
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
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        try {
          const [, , selfStart] = await coreSetup.getStartServices();
          const { smlService } = selfStart;
          const coreContext = await ctx.core;
          const { query, size, fields, constraints, filters } = request.body;
          const esClient = coreContext.elasticsearch.client;
          const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

          const { results } = await smlService.search({
            query,
            size,
            fields,
            spaceId,
            esClient,
            request,
            constraints,
            filters,
          });

          const body: SmlSearchHttpResponse = {
            results: results.map((hit) => {
              const item: SmlSearchHttpResultItem = {
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
          if (
            error instanceof SmlAuthzEnumerationIncompleteError ||
            error instanceof SmlCorpusTooLargeError
          ) {
            logger.warn(`SML search authorization unavailable: ${(error as Error).message}`);
            return response.customError({
              statusCode: 503,
              body: { message: (error as Error).message },
            });
          }
          logger.error(`SML search route error: ${(error as Error).message}`);
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
