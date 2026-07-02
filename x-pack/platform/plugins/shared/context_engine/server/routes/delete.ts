/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CeDeleteHttpResponse } from '../../common/http_api/ce';
import {
  ceByTypeAndOriginIdPath,
  MAX_CE_ORIGIN_ID_LENGTH,
  MAX_CE_TYPE_LENGTH,
} from '../../common/constants';
import type { CeService } from '../services/ce/types';
import { isVisibleInSpace } from '../services/ce/ce_service';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { WRITE_SECURITY, withCeFeatureFlag } from './common';

/**
 * `DELETE /internal/context_engine/ce/{type}/{originId}`
 *
 * Removes all entries under `(type, originId)` via `deleteAttachment`.
 * Cross-space guard: returns 404 (not 403) when the origin is invisible
 * from the caller's space. Per-entry privilege guard: caller must hold
 * read access to every entry they are about to delete.
 */
export const registerDeleteRoute = ({
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
  router.delete(
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
      security: WRITE_SECURITY,
    },
    withCeFeatureFlag(async (ctx, request, response) => {
      try {
        const ce = getCeService();
        const { type, originId } = request.params as { type: string; originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const existing = await ce.findByOriginAcrossSpaces({ type, originId, esClient });
        if (existing.length === 0) {
          return response.notFound({
            body: { message: `CE origin '${type}/${originId}' not found` },
          });
        }

        const visibleInCallerSpace = existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `CE origin '${type}/${originId}' not found` },
          });
        }

        // Per-entry permission check before deleting — same gate the
        // GET route applies. A caller who cannot read every entry
        // for the origin should not be allowed to delete the lot.
        const accessMap = await ce.checkItemsAccess({
          ids: existing.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const unauthorized = existing.filter((d) => accessMap.get(d.id) !== true);
        if (unauthorized.length > 0) {
          return response.notFound({
            body: { message: `CE origin '${type}/${originId}' not found` },
          });
        }

        await ce.deleteAttachment({
          originId,
          attachmentType: type,
          spaces: [spaceId],
          esClient: esClient.asInternalUser,
          savedObjectsClient,
          logger,
          ingestionMethod: 'all',
        });

        const body: CeDeleteHttpResponse = { origin_id: originId, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`CE delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
