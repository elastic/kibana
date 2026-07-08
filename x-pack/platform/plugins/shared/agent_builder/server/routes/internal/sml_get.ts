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
import {
  smlByTypeAndOriginIdPath,
  MAX_SML_ORIGIN_ID_LENGTH,
  MAX_SML_TYPE_LENGTH,
} from '../../../common/constants';
import type { SmlGetHttpResponse } from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { toSmlHttpItem } from './sml_common';

/**
 * `GET /internal/agent_builder/sml/{type}/{originId}`
 *
 * Returns all documents for `(type, originId)` visible from the caller's space.
 * Documents the caller lacks privileges for are filtered out; an empty result
 * is reported as 404 to avoid disclosing their existence.
 */
export function registerInternalSmlGetRoute({ router, logger, coreSetup }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: smlByTypeAndOriginIdPath,
      validate: {
        params: schema.object({
          type: schema.string({
            minLength: 1,
            maxLength: MAX_SML_TYPE_LENGTH,
            validate: (v) =>
              /^[a-z][a-z0-9_]*$/.test(v)
                ? undefined
                : 'must be a lowercase identifier starting with a letter, e.g. "visualization", "my_notes"',
          }),
          originId: schema.string({ minLength: 1, maxLength: MAX_SML_ORIGIN_ID_LENGTH }),
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
          const { type, originId } = request.params as { type: string; originId: string };
          const coreContext = await ctx.core;
          const esClient = coreContext.elasticsearch.client;
          const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

          const docs = await smlService.findByOrigin({ type, originId, spaceId, esClient });
          if (docs.length === 0) {
            return response.notFound({
              body: { message: `SML origin '${type}/${originId}' not found` },
            });
          }

          const accessMap = await smlService.checkItemsAccess({
            ids: docs.map((d) => d.id),
            spaceId,
            esClient,
            request,
          });
          const authorized = docs.filter((d) => accessMap.get(d.id) === true);
          if (authorized.length === 0) {
            return response.notFound({
              body: { message: `SML origin '${type}/${originId}' not found` },
            });
          }

          const body: SmlGetHttpResponse = { items: authorized.map(toSmlHttpItem) };
          return response.ok({ body });
        } catch (error) {
          logger.error(`SML get route error: ${(error as Error).message}`);
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
