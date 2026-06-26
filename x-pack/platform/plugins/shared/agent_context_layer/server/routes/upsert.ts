/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlUpsertHttpResponse } from '../../common/http_api/sml';
import {
  smlByTypeAndOriginIdPath,
  MAX_SML_ORIGIN_ID_LENGTH,
  MAX_SML_TYPE_LENGTH,
  MAX_SML_TITLE_LENGTH,
  MAX_SML_CONTENT_LENGTH,
  MAX_SML_TAG_LENGTH,
  MAX_SML_TAGS_PER_DOCUMENT,
} from '../../common/constants';
import type { SmlChunk, SmlService } from '../services/sml/types';
import { isVisibleInSpace } from '../services/sml/sml_service';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { WRITE_SECURITY, toSmlHttpItem, withSmlFeatureFlag } from './common';

/**
 * `PUT /internal/agent_context_layer/sml/{type}/{originId}`
 *
 * Writes a single manual chunk under `(type, originId)` via
 * {@link SmlService.indexAttachment} content-mode — the same code path
 * the workflow step's `sml.index` action uses.
 *
 * The URL is compound on purpose: `type` plus `originId` is the only
 * pair that addresses a chunk unambiguously. The bare `originId` is
 * not globally unique (a `lens` id and a `dashboard` id can
 * legitimately collide), and the storage's canonical key is the
 * compound `origin.uri = ${type}://${originId}`. An earlier shape
 * (`/sml/{originId}`) assumed the bare id was system-unique and
 * routed every lookup through a phantom `origin_id` keyword that
 * isn't in the index mapping — every per-origin route silently
 * 404'd. See `common/constants.ts` for the long-form history.
 *
 * Permissions are stamped by the indexer:
 * - When `type` matches a registered SML type, its `getPermissions`
 *   hook supplies them.
 * - When it doesn't (ad-hoc namespace), the indexer stamps empty
 *   `SmlPermissions` and the chunk becomes readable to anyone in the
 *   caller's space. The indexer logs a once-per-process warn so this
 *   doesn't happen invisibly. Callers cannot influence permissions
 *   from the body — that surface was removed to close a spoofing
 *   vector.
 *
 * The indexer's content-mode write wipes every existing chunk for
 * the origin (regardless of `ingestion_method`), so this route is
 * the "claim the origin" semantic — any crawler-written chunks for
 * that `(type, originId)` are replaced.
 *
 * Cross-space guard: before calling the indexer the route looks the
 * origin up across all spaces and rejects requests from a space that
 * cannot see it (404) so a caller in space A cannot stomp on chunks
 * in space B.
 *
 * Per-chunk privilege guard: when the origin already has chunks in
 * the caller's space, the route also runs `checkItemsAccess` to
 * confirm the caller has the Kibana privileges those chunks were
 * gated with. Without this gate, a user holding
 * `agentContextLayer:write` but lacking the underlying object
 * privileges (e.g. `saved_object:dashboard/get`) could PUT new
 * content over a dashboard origin — the indexer would dutifully
 * delete the existing permission-gated chunks and write the caller's
 * chunks in their place, achieving content injection on a resource
 * the caller cannot read. Mirroring the DELETE route's gate (and
 * returning 404 rather than 403) keeps the surface symmetric and
 * avoids disclosing the existence of gated chunks the caller cannot
 * see.
 *
 * `tags` semantics: the route writes the new chunk wholesale via the
 * indexer's content-mode write — there is no merge/patch step. A PUT
 * that omits `tags` therefore CLEARS any previously stored tags.
 * This is the intended REST `PUT` semantic (the body is the complete
 * new representation), but callers used to JSON-merge semantics
 * should pin the current tag list explicitly. The behaviour is
 * locked in by a route-level test.
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
      path: smlByTypeAndOriginIdPath,
      validate: {
        // The `type` URL param carries the same syntactic guard as the
        // workflow step schema and the (now-removed) body field —
        // lowercase identifier starting with a letter. It's the last
        // line of defense against junk namespace ids reaching the
        // index, since the indexer is permissive about whether a type
        // is registered. `originId` is bounded but otherwise free-form
        // — it's the producer's externally-issued key.
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
        // Neither `type`, `permissions`, nor `origin_id` appear in
        // this body:
        // - `type` is the URL path param; duplicating it invites
        //   caller/path mismatch and a 400-vs-409 question with no
        //   user value. (An older revision accepted `body.type` and
        //   tolerated mismatches; this is the long-form contract we
        //   moved to.)
        // - `permissions` are derived by the indexer from the
        //   registered SML type's `getPermissions` hook (same source
        //   of truth as the crawler, the workflow step, and
        //   event-driven writes); the old caller-supplied
        //   `permissions` field was a spoofing surface that let an
        //   HTTP client set the access-control gate independently of
        //   the type it was stamping.
        // - `origin_id` is the URL path parameter; duplicating it in
        //   the body invites caller/path mismatch with no
        //   consistency check.
        //
        // Every string field carries a `maxLength` to keep the
        // request envelope predictable (a single PUT cannot exceed
        // ~MAX_SML_CONTENT_LENGTH + a few KB of overhead). The
        // workflow step's content-mode applies the same caps via
        // `AttachmentChunkSchema` so HTTP and workflow producers
        // share a single envelope — `tags` reuses both the per-tag
        // length cap and the per-document tag-count cap.
        body: schema.object({
          title: schema.string({ minLength: 1, maxLength: MAX_SML_TITLE_LENGTH }),
          content: schema.string({ maxLength: MAX_SML_CONTENT_LENGTH }),
          tags: schema.maybe(
            schema.arrayOf(
              schema.string({
                maxLength: MAX_SML_TAG_LENGTH,
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
                maxSize: MAX_SML_TAGS_PER_DOCUMENT,
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
        const { type, originId } = request.params as { type: string; originId: string };
        const body = request.body as {
          title: string;
          content: string;
          tags?: string[];
        };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        // Cross-space guard: an origin already owned by a different
        // space is opaque to the caller — return 404 rather than 403
        // to avoid disclosing the existence of resources in other
        // spaces.
        const existing = await sml.findByOriginAcrossSpaces({ type, originId, esClient });
        const visibleInCallerSpace =
          existing.length === 0 || existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `SML origin '${type}/${originId}' not found` },
          });
        }

        // Per-chunk privilege gate — same shape as the DELETE route's
        // gate. Writing under an existing origin overwrites every
        // chunk already there, so the caller must be able to read
        // every chunk they're about to replace; otherwise a caller
        // with `agentContextLayer:write` but no
        // `saved_object:dashboard/get` could overwrite a
        // permission-gated dashboard chunk with attacker-controlled
        // content. Empty `existing` is a fresh create — no existing
        // privileges to check.
        if (existing.length > 0) {
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
        }

        const created = existing.length === 0;
        const action = created ? 'create' : 'update';
        const chunk: SmlChunk = {
          type,
          title: body.title,
          content: body.content,
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
        };

        await sml.indexAttachment({
          originId,
          attachmentType: type,
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
        const persisted = await sml.findByOrigin({ type, originId, spaceId, esClient });

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
