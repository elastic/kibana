/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlDeleteHttpResponse } from '../../common/http_api/sml';
import { smlByOriginIdPath, MAX_SML_ORIGIN_ID_LENGTH } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import { isVisibleInSpace } from '../services/sml/sml_service';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, withSmlFeatureFlag } from './common';

/**
 * `DELETE /internal/agent_context_layer/sml/{originId}`
 *
 * Removes every chunk written under the origin (manual + crawled) via
 * {@link SmlService.deleteAttachment} with `ingestionMethod: 'all'`,
 * mirroring the PUT route's "claim the origin" semantic in reverse.
 *
 * `attachmentType` is not part of the URL — the route discovers it by
 * looking up the existing chunks first. This relies on the system-wide
 * convention that `origin_id` is globally unique (same one the PUT
 * route assumes). If multiple types share an `origin_id`, every type
 * found is dispatched a separate delete so cleanup is total.
 *
 * Cross-space guard: an origin owned by another space is reported as
 * 404 (same shape as the GET route) so a caller in space A cannot
 * even probe for origins in space B.
 */
export const registerDeleteRoute = ({
  router,
  coreSetup,
  logger,
  getSmlService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
  logger: Logger;
  getSmlService: () => SmlService;
}) => {
  router.delete(
    {
      path: smlByOriginIdPath,
      validate: {
        params: schema.object({
          originId: schema.string({ minLength: 1, maxLength: MAX_SML_ORIGIN_ID_LENGTH }),
        }),
      },
      options: { access: 'internal' },
      security: WRITE_SECURITY,
    },
    withSmlFeatureFlag(async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { originId } = request.params as { originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const existing = await sml.findByOriginIdAcrossSpaces({ originId, esClient });
        if (existing.length === 0) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        const visibleInCallerSpace = existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        // Per-chunk permission check before deleting — same gate the
        // GET route applies. A caller who cannot read every chunk
        // for the origin should not be allowed to delete the lot.
        const accessMap = await sml.checkItemsAccess({
          ids: existing.map((d) => d.id),
          spaceId,
          esClient,
          request,
        });
        const unauthorized = existing.filter((d) => accessMap.get(d.id) !== true);
        if (unauthorized.length > 0) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        // Origin id is conventionally globally unique, but a producer
        // could in theory reuse the same id under two types — dispatch
        // a delete per distinct type so cleanup is exhaustive instead
        // of leaving the second type's chunks dangling.
        //
        // The deletes are independent (each is scoped by `(origin_id,
        // attachmentType)`) so `Promise.all` is safe and meaningfully
        // faster than a serial loop on every origin reuse case — the
        // typical pathological example is a corpus_entry id reused as
        // a notes type during migration, which currently doubles
        // route latency for no reason.
        const types = new Set(existing.map((d) => d.type));
        await Promise.all(
          Array.from(types, (attachmentType) =>
            sml.deleteAttachment({
              originId,
              attachmentType,
              spaces: [spaceId],
              esClient: esClient.asInternalUser,
              savedObjectsClient,
              logger,
              ingestionMethod: 'all',
            })
          )
        );

        const body: SmlDeleteHttpResponse = { origin_id: originId, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`SML delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
