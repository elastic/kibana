/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ContextEngineDeleteHttpResponse } from '../../common/http_api/context_engine';
import {
  contextEngineByTypeAndOriginIdPath,
  MAX_CONTEXT_ENGINE_ORIGIN_ID_LENGTH,
  MAX_CONTEXT_ENGINE_TYPE_LENGTH,
} from '../../common/constants';
import type { ContextEngineService } from '../services/engine/types';
import { isVisibleInSpace } from '../services/engine/service';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { WRITE_SECURITY, withContextEngineFeatureFlag } from './common';

/**
 * `DELETE /internal/agent_context_layer/sml/{type}/{originId}`
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
  getContextEngineService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  logger: Logger;
  getContextEngineService: () => ContextEngineService;
}) => {
  router.delete(
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
      security: WRITE_SECURITY,
    },
    withContextEngineFeatureFlag(async (ctx, request, response) => {
      try {
        const contextEngine = getContextEngineService();
        const { type, originId } = request.params as { type: string; originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const existing = await contextEngine.findByOriginAcrossSpaces({ type, originId, esClient });
        if (existing.length === 0) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        const visibleInCallerSpace = existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        // Per-entry permission check before deleting — same gate the
        // GET route applies. A caller who cannot read every entry
        // for the origin should not be allowed to delete the lot.
        const accessMap = await contextEngine.checkItemsAccess({
          ids: existing.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const unauthorized = existing.filter((d) => accessMap.get(d.id) !== true);
        if (unauthorized.length > 0) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        await contextEngine.deleteAttachment({
          originId,
          attachmentType: type,
          spaces: [spaceId],
          esClient: esClient.asInternalUser,
          savedObjectsClient,
          logger,
          ingestionMethod: 'all',
        });

        const body: ContextEngineDeleteHttpResponse = { origin_id: originId, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`Context Engine delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
