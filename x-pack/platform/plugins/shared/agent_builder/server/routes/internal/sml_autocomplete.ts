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
import { smlAutocompletePath } from '../../../common/constants';
import {
  SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
  type SmlAutocompleteHttpResponse,
  type SmlAutocompleteHttpResultItem,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';

const SML_AUTOCOMPLETE_SIZE_MAX = 50;

export function registerInternalSmlAutocompleteRoute({
  router,
  logger,
  coreSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: smlAutocompletePath,
      validate: {
        body: schema.object({
          query: schema.string({
            minLength: 1,
            maxLength: SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
          }),
          size: schema.maybe(schema.number({ min: 1, max: SML_AUTOCOMPLETE_SIZE_MAX })),
          constraints: schema.maybe(
            schema.recordOf(
              schema.literal(SmlSearchFilterType.connector),
              schema.object({
                ids: schema.maybe(
                  schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })
                ),
              })
            )
          ),
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
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        try {
          const [, , selfStart] = await coreSetup.getStartServices();
          const { smlService } = selfStart;
          const { query, size, constraints, filters } = request.body;
          const coreContext = await ctx.core;
          const esClient = coreContext.elasticsearch.client;
          const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

          const { results } = await smlService.autocomplete({
            query,
            size,
            spaceId,
            esClient,
            request,
            constraints,
            filters,
          });

          const body: SmlAutocompleteHttpResponse = {
            results: results.map(
              ({
                id,
                type,
                origin,
                title,
                matched_discovery_labels,
              }): SmlAutocompleteHttpResultItem => ({
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
          logger.error(`SML autocomplete route error: ${(error as Error).message}`);
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
