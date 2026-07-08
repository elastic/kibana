/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ContextEngineUpsertHttpResponse } from '../../common/http_api/context_engine';
import {
  contextEngineByTypeAndOriginIdPath,
  MAX_CONTEXT_ENGINE_ORIGIN_ID_LENGTH,
  MAX_CONTEXT_ENGINE_TYPE_LENGTH,
  MAX_CONTEXT_ENGINE_TITLE_LENGTH,
  MAX_CONTEXT_ENGINE_CONTENT_LENGTH,
  MAX_CONTEXT_ENGINE_TAG_LENGTH,
  MAX_CONTEXT_ENGINE_TAGS_PER_DOCUMENT,
  MAX_CONTEXT_ENGINE_PERMISSIONS_NAME_LENGTH,
  MAX_CONTEXT_ENGINE_PERMISSIONS_ENTRIES,
} from '../../common/constants';
import { ContextEnginePermissionsConflictError } from '../services/engine/errors';
import type {
  ContextEngineEntry,
  ContextEnginePermissions,
  ContextEngineService,
} from '../services/engine/types';
import { isVisibleInSpace } from '../services/engine/service';
import type { ContextEngineStartDependencies, ContextEnginePluginStart } from '../types';
import { WRITE_SECURITY, toContextEngineHttpItem, withContextEngineFeatureFlag } from './common';

/**
 * `PUT /internal/agent_context_layer/sml/{type}/{originId}`
 *
 * Writes a manual entry via `indexAttachment` content-mode (same path as the
 * workflow step). The write replaces all existing entries for the origin
 * ("claim the origin" semantic). Omitting `tags` clears them — PUT is a
 * full-document replace, not a merge.
 *
 * `permissions` mirrors the workflow step's `contextEngine.addEntry` input:
 * applies only when `type` has no `getPermissions` hook. Supplying it for a
 * hook-backed type throws {@link ContextEnginePermissionsConflictError}, mapped below to 409.
 *
 * Cross-space guard: origins invisible from the caller's space return 404.
 * Per-entry privilege guard: caller must hold read access to every existing
 * entry before they can overwrite it, to prevent content injection on
 * permission-gated origins. Both guards return 404 (not 403) to avoid
 * disclosing the existence of entries the caller cannot see.
 */
export const registerUpsertRoute = ({
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
  router.put(
    {
      path: contextEngineByTypeAndOriginIdPath,
      validate: {
        // `type` is validated as a lowercase identifier; the indexer is permissive about
        // registration, so this is the last syntactic guard against junk namespace ids.
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
        // `type` and `originId` are URL params only — never accepted from the body.
        body: schema.object({
          title: schema.string({ minLength: 1, maxLength: MAX_CONTEXT_ENGINE_TITLE_LENGTH }),
          content: schema.string({ maxLength: MAX_CONTEXT_ENGINE_CONTENT_LENGTH }),
          tags: schema.maybe(
            schema.arrayOf(
              schema.string({
                maxLength: MAX_CONTEXT_ENGINE_TAG_LENGTH,
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
                maxSize: MAX_CONTEXT_ENGINE_TAGS_PER_DOCUMENT,
                meta: {
                  description:
                    'Optional tags for grouping and retrieval. Tags are matched with OR semantics on the list endpoint — a document is returned if it has any of the requested tags. Maximum 100 tags per document; each tag is at most 100 characters.',
                },
              }
            )
          ),
          permissions: schema.maybe(
            schema.object(
              {
                elasticsearch: schema.maybe(
                  schema.object({
                    indices: schema.maybe(
                      schema.arrayOf(
                        schema.object({
                          name: schema.string({
                            minLength: 1,
                            maxLength: MAX_CONTEXT_ENGINE_PERMISSIONS_NAME_LENGTH,
                          }),
                        }),
                        { maxSize: MAX_CONTEXT_ENGINE_PERMISSIONS_ENTRIES }
                      )
                    ),
                  })
                ),
                kibana: schema.maybe(
                  schema.object({
                    privileges: schema.maybe(
                      schema.arrayOf(
                        schema.object({
                          name: schema.string({
                            minLength: 1,
                            maxLength: MAX_CONTEXT_ENGINE_PERMISSIONS_NAME_LENGTH,
                          }),
                        }),
                        { maxSize: MAX_CONTEXT_ENGINE_PERMISSIONS_ENTRIES }
                      )
                    ),
                  })
                ),
              },
              {
                meta: {
                  description:
                    'Permissions to stamp on the written entry when `type` has no getPermissions hook. Rejected if the type derives permissions via getPermissions.',
                },
              }
            )
          ),
        }),
      },
      options: { access: 'internal' },
      security: WRITE_SECURITY,
    },
    withContextEngineFeatureFlag(async (ctx, request, response) => {
      try {
        const contextEngine = getContextEngineService();
        const { type, originId } = request.params as { type: string; originId: string };
        const body = request.body as {
          title: string;
          content: string;
          tags?: string[];
          permissions?: {
            elasticsearch?: { indices?: Array<{ name: string }> };
            kibana?: { privileges?: Array<{ name: string }> };
          };
        };
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;
        const savedObjectsClient = coreContext.savedObjects.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        // Cross-space guard: 404 (not 403) to avoid disclosing origins in other spaces.
        const existing = await contextEngine.findByOriginAcrossSpaces({ type, originId, esClient });
        const visibleInCallerSpace =
          existing.length === 0 || existing.some((doc) => isVisibleInSpace(doc.spaces, spaceId));
        if (!visibleInCallerSpace) {
          return response.notFound({
            body: { message: `Context Engine origin '${type}/${originId}' not found` },
          });
        }

        // Per-entry privilege gate: caller must hold read access to every entry they
        // are about to replace — prevents content injection on permission-gated origins.
        if (existing.length > 0) {
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
        }

        const created = existing.length === 0;
        const action = created ? 'create' : 'update';
        const entry: ContextEngineEntry = {
          type,
          title: body.title,
          content: body.content,
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
        };

        const existingCreatedAt = existing.find((d) =>
          isVisibleInSpace(d.spaces, spaceId)
        )?.created_at;

        // Fold in empty arrays for any omitted half, as the workflow step does.
        const permissions: ContextEnginePermissions | undefined =
          body.permissions !== undefined
            ? {
                kibana: { privileges: body.permissions.kibana?.privileges ?? [] },
                elasticsearch: { indices: body.permissions.elasticsearch?.indices ?? [] },
              }
            : undefined;

        await contextEngine.indexAttachment({
          originId,
          attachmentType: type,
          action,
          spaces: [spaceId],
          esClient: esClient.asInternalUser,
          savedObjectsClient,
          logger,
          content: [entry],
          createdAt: existingCreatedAt,
          ...(permissions !== undefined ? { permissions } : {}),
        });

        // Re-read to return the indexer-stamped state (permissions, created_at, entry ids).
        const persisted = await contextEngine.findByOrigin({ type, originId, spaceId, esClient });

        const responseBody: ContextEngineUpsertHttpResponse = {
          items: persisted.map(toContextEngineHttpItem),
          created,
        };
        return response.ok({ body: responseBody });
      } catch (error) {
        // Client input error (caller supplied `permissions` for a type whose
        // `getPermissions` hook is authoritative) — not a server fault.
        if (error instanceof ContextEnginePermissionsConflictError) {
          logger.warn(`Context Engine upsert permissions conflict: ${error.message}`);
          return response.conflict({ body: { message: error.message } });
        }
        logger.error(`Context Engine upsert route error: ${(error as Error).message}`);
        throw error;
      }
    })
  );
};
