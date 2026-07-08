/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ContextEngineGetHttpResponse } from '../../common/http_api/context_engine';
import {
  contextEngineByTypeAndOriginIdPath,
  MAX_CONTEXT_ENGINE_ORIGIN_ID_LENGTH,
  MAX_CONTEXT_ENGINE_TYPE_LENGTH,
} from '../../common/constants';
import type { ContextEngineService } from '../services/engine/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { READ_SECURITY, toContextEngineHttpItem, withContextEngineFeatureFlag } from './common';

/**
 * `GET /internal/agent_context_layer/sml/{type}/{originId}`
 *
 * Returns all entries for `(type, originId)` visible from the caller's space.
 * Entries the caller lacks privileges for are filtered out; an empty result
 * is reported as 404 to avoid disclosing their existence.
 */
export const registerGetRoute = ({
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
      path: contextEngineByTypeAndOriginIdPath,
      validate: {
        params: schema.object({
          type: schema.string({
            minLength: 1,
            maxLength: MAX_CONTEXT_ENGINE_TYPE_LENGTH,
            validate: (v) =>
              /^[a-z][a-z0-9_]*$/.test(v)
                ? undefined
                : 'must be a lowercase identifier starting with a letter, e.g. "visualization", "my_notes"',
          }),
          originId: schema.string({ minLength: 1, maxLength: MAX_CONTEXT_ENGINE_ORIGIN_ID_LENGTH }),
        }),
      },
      options: { access: 'internal' },
      security: READ_SECURITY,
    },
    withContextEngineFeatureFlag(async (ctx, request, response) => {
      try {
        const contextEngine = getContextEngineService();
        const { type, originId } = request.params as { type: string; originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const docs = await contextEngine.findByOrigin({ type, originId, spaceId, esClient });
        if (docs.length === 0) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        const accessMap = await contextEngine.checkItemsAccess({
          ids: docs.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const authorized = docs.filter((d) => accessMap.get(d.id) === true);
        if (authorized.length === 0) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        const body: ContextEngineGetHttpResponse = {
          items: authorized.map(toContextEngineHttpItem),
        };
        return response.ok({ body });
      } catch (error) {
        logger.error(`Context Engine get route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
