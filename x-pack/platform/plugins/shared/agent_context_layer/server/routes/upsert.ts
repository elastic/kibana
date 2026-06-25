/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlUpsertHttpResponse } from '../../common/http_api/sml';
import { smlByOriginIdPath } from '../../common/constants';
import type { SmlChunk, SmlService } from '../services/sml/types';
import { isVisibleInSpace } from '../services/sml/sml_service';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, toSmlHttpItem, withSmlFeatureFlag } from './common';

/**
 * `PUT /internal/agent_context_layer/sml/{originId}`
 *
 * Writes a single manual chunk under the origin via
 * {@link SmlService.indexAttachment} content-mode — the same code path
 * the workflow step's `sml.index` action uses.
 *
 * Permissions are stamped by the indexer:
 * - When `body.type` matches a registered SML type, its `getPermissions`
 *   hook supplies them.
 * - When it doesn't (ad-hoc namespace), the indexer stamps empty
 *   `SmlPermissions` and the chunk becomes readable to anyone in the
 *   caller's space. The indexer logs a once-per-process warn so this
 *   doesn't happen invisibly. Callers cannot influence permissions from
 *   the body — that surface was removed to close a spoofing vector.
 *
 * The indexer's content-mode write wipes every existing chunk for the
 * origin (regardless of `ingestion_method`), so this route is the
 * "claim the origin" semantic — any crawler-written chunks for that
 * `origin_id` are replaced.
 *
 * Cross-space guard: before calling the indexer the route looks the
 * origin up across all spaces and rejects requests from a space that
 * cannot see it (404) so a caller in space A cannot stomp on chunks
 * in space B.
 */
export const registerUpsertRoute = ({
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
  router.put(
    {
      path: smlByOriginIdPath,
      validate: {
        params: schema.object({
          originId: schema.string({ minLength: 1 }),
        }),
        // TODO: Add maxLength bounds to string fields (type, title, content) to
        // prevent abuse with excessively long values.
        //
        // Neither `permissions` nor `origin_id` appear in this body:
        // - `permissions` are derived by the indexer from the registered SML
        //   type's `getPermissions` hook (same source of truth as the
        //   crawler, the workflow step, and event-driven writes); the old
        //   caller-supplied `permissions` field was a spoofing surface that
        //   let an HTTP client set the access-control gate independently of
        //   the type it was stamping.
        // - `origin_id` is the URL path parameter; duplicating it in the
        //   body invites caller/path mismatch with no consistency check.
        body: schema.object({
          // Syntactic guard on the type identifier. The indexer no longer
          // rejects unregistered types (see SmlIndexer.indexManualChunks),
          // so this regex is the last line of defense against junk values
          // — empty strings, slashes, whitespace — leaking in as durable
          // namespace identifiers. The shape matches the convention used
          // by every built-in SML type id (`visualization`, `dashboard`,
          // `connector`, `workflow`, `corpus_entry`, …).
          type: schema.string({
            minLength: 1,
            maxLength: 256,
            validate: (v) =>
              /^[a-z][a-z0-9_]*$/.test(v)
                ? undefined
                : 'must be a lowercase identifier starting with a letter, e.g. "visualization", "my_notes"',
          }),
          title: schema.string({ minLength: 1 }),
          content: schema.string(),
          tags: schema.maybe(
            schema.arrayOf(
              schema.string({
                maxLength: 100,
                validate: (v) =>
                  /^[a-z0-9][a-z0-9_-]*$/.test(v)
                    ? undefined
                    : 'must be lowercase alphanumeric and may contain hyphens or underscores (e.g. "my-tag", "otel_v2")',
                meta: {
                  description:
                    'A single tag value. Must be lowercase alphanumeric; hyphens and underscores are allowed (e.g. "otel", "my-tag", "v2_data"). Commas are not allowed — use separate array entries.',
                },
              }),
              {
                maxSize: 100,
                meta: {
                  description:
                    'Optional tags for grouping and retrieval. Tags are matched with OR semantics on the list endpoint — a document is returned if it has any of the requested tags. Maximum 100 tags per document; each tag is at most 100 characters.',
                },
              }
            )
          ),
        }),
      },
      options: { access: 'internal' },
      security: WRITE_SECURITY,
    },
    withSmlFeatureFlag(async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { originId } = request.params as { originId: string };
        const body = request.body as {
          type: string;
          title: string;
          content: string;
          tags?: string[];
        };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        // Cross-space guard: an origin already owned by a different space
        // is opaque to the caller — return 404 rather than 403 to avoid
        // disclosing the existence of resources in other spaces.
        const existing = await sml.findByOriginIdAcrossSpaces({ originId, esClient });
        const visibleInCallerSpace =
          existing.length === 0 || existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `SML origin '${originId}' not found` },
          });
        }

        const created = existing.length === 0;
        const action = created ? 'create' : 'update';
        const chunk: SmlChunk = {
          type: body.type,
          title: body.title,
          content: body.content,
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
        };

        await sml.indexAttachment({
          originId,
          attachmentType: body.type,
          action,
          spaces: [spaceId],
          esClient: esClient.asInternalUser,
          savedObjectsClient,
          logger,
          content: [chunk],
        });

        // Re-read so the response reflects what the indexer actually
        // persisted (chunk `_id`, server-assigned `created_at`,
        // stamped `permissions`, etc.). The content-mode write wipes
        // all prior chunks for the origin so the post-state is the
        // chunks just written.
        const persisted = await sml.findByOriginId({ originId, spaceId, esClient });

        const responseBody: SmlUpsertHttpResponse = {
          items: persisted.map(toSmlHttpItem),
          created,
        };
        return response.ok({ body: responseBody });
      } catch (error) {
        logger.error(`SML upsert route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
