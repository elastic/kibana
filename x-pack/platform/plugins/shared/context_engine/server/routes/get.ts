/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CeGetHttpResponse } from '../../common/http_api/ce';
import {
  ceByTypeAndOriginIdPath,
  MAX_CE_ORIGIN_ID_LENGTH,
  MAX_CE_TYPE_LENGTH,
} from '../../common/constants';
import type { CeService } from '../services/ce/types';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { READ_SECURITY, toCeHttpItem, withCeFeatureFlag } from './common';

/**
 * `GET /internal/context_engine/ce/{type}/{originId}`
 *
 * Returns all entries for `(type, originId)` visible from the caller's space.
 * Entries the caller lacks privileges for are filtered out; an empty result
 * is reported as 404 to avoid disclosing their existence.
 */
export const registerGetRoute = ({
  router,
  coreSetup,
  logger,
  getCeService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  logger: Logger;
  getCeService: () => CeService;
}) => {
  router.get(
    {
      path: ceByTypeAndOriginIdPath,
      validate: {
        params: schema.object({
          type: schema.string({
            minLength: 1,
            maxLength: MAX_CE_TYPE_LENGTH,
            validate: (v) =>
              /^[a-z][a-z0-9_]*$/.test(v)
                ? undefined
                : 'must be a lowercase identifier starting with a letter, e.g. "visualization", "my_notes"',
          }),
          originId: schema.string({ minLength: 1, maxLength: MAX_CE_ORIGIN_ID_LENGTH }),
        }),
      },
      options: { access: 'internal' },
      security: READ_SECURITY,
    },
    withCeFeatureFlag(async (ctx, request, response) => {
      try {
        const ce = getCeService();
        const { type, originId } = request.params as { type: string; originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const docs = await ce.findByOrigin({ type, originId, spaceId, esClient });
        if (docs.length === 0) {
          return response.notFound({
            body: { message: `CE origin '${type}/${originId}' not found` },
          });
        }

        const accessMap = await ce.checkItemsAccess({
          ids: docs.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const authorized = docs.filter((d) => accessMap.get(d.id) === true);
        if (authorized.length === 0) {
          return response.notFound({
            body: { message: `CE origin '${type}/${originId}' not found` },
          });
        }

        const body: CeGetHttpResponse = { items: authorized.map(toCeHttpItem) };
        return response.ok({ body });
      } catch (error) {
        logger.error(`CE get route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
