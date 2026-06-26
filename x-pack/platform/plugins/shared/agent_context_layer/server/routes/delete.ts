/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlDeleteHttpResponse } from '../../common/http_api/sml';
import {
  smlByTypeAndOriginIdPath,
  MAX_SML_ORIGIN_ID_LENGTH,
  MAX_SML_TYPE_LENGTH,
} from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import { isVisibleInSpace } from '../services/sml/sml_service';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, withSmlFeatureFlag } from './common';

/**
 * `DELETE /internal/agent_context_layer/sml/{type}/{originId}`
 *
 * Removes every chunk written under the compound `(type, originId)`
 * key (manual + crawled) via
 * {@link SmlService.deleteAttachment} with `ingestionMethod: 'all'`,
 * mirroring the PUT route's "claim the origin" semantic in reverse.
 *
 * `type` is part of the URL because the storage's canonical key is
 * the compound `origin.uri = ${type}://${originId}`. An earlier
 * design discovered the type by enumerating existing chunks — that
 * path queried a phantom `origin_id` keyword that's not in the index
 * mapping and silently returned `[]`, so every DELETE 404'd. Putting
 * `type` in the URL also lets the indexer's `deleteAttachment`
 * target a single canonical URI in `deleteByQuery`, instead of the
 * route fanning out one call per discovered type.
 *
 * Cross-space guard: an origin owned by another space is reported
 * as 404 (same shape as the GET route) so a caller in space A
 * cannot even probe for origins in space B.
 *
 * Per-chunk privilege guard: a caller who cannot read every chunk
 * for the origin should not be allowed to delete the lot. Mirrors
 * the upsert route's `checkItemsAccess` shape.
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
      security: WRITE_SECURITY,
    },
    withSmlFeatureFlag(async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { type, originId } = request.params as { type: string; originId: string };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const existing = await sml.findByOriginAcrossSpaces({ type, originId, esClient });
        if (existing.length === 0) {
          return response.notFound({
            body: { message: `SML origin '${type}/${originId}' not found` },
          });
        }

        const visibleInCallerSpace = existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `SML origin '${type}/${originId}' not found` },
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
            body: { message: `SML origin '${type}/${originId}' not found` },
          });
        }

        // Single delete — `type` pins the canonical `origin.uri`, no
        // multi-type fan-out needed. The previous shape looped over
        // distinct types because the URL omitted `type` and the
        // route had to discover it; that whole branch is dead with
        // `type` in the path.
        await sml.deleteAttachment({
          originId,
          attachmentType: type,
          spaces: [spaceId],
          esClient: esClient.asInternalUser,
          savedObjectsClient,
          logger,
          ingestionMethod: 'all',
        });

        const body: SmlDeleteHttpResponse = { origin_id: originId, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`SML delete route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
