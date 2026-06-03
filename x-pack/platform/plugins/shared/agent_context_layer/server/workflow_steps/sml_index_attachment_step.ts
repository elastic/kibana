/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { smlIndexAttachmentStepCommonDefinition } from '../../common/workflow_steps/sml_index_attachment_step';
import type { SmlChunk } from '../services/sml/types';
import type { AgentContextLayerPluginStart } from '../types';

/**
 * Factory for the SML "index attachment" workflow step.
 *
 * Workflow writes always go through the **content-mode** path on the AGL
 * start contract — the workflow author supplies `chunks` for `upsert`,
 * which the indexer writes as `ingestion_method: 'manual'`. The indexer's
 * content-mode path is idempotent (always a full replace), so we expose a
 * single `upsert` action rather than the misleading `create`/`update`
 * pair the start contract internally allows for content-mode writes
 * (neither would actually fail-if-exists / fail-if-not-found here).
 *
 * For `delete`, the handler calls `deleteAttachment` (a sibling method on
 * the AGL contract, distinct from `indexAttachment({ action: 'delete' })`)
 * with `ingestionMethod: 'all'`, which wipes every chunk for the
 * `origin_id` regardless of how it was produced (manual + crawled). This
 * matches the "workflow owns this origin" semantic — opposite of
 * `indexAttachment`'s delete, which keeps curated manuals around so
 * crawler / event-driven CRUD callers don't clobber pinned content.
 *
 * The `getTypeDefinition` guard intentionally only fires on the `upsert`
 * branch: writes against an unregistered type are nonsensical (no
 * `getSmlData` hook to fall back to, no `toAttachment` for downstream
 * consumers), but `delete` must remain functional even after a plugin
 * that registered the type is disabled — otherwise stale chunks become
 * unreachable from the workflow surface.
 *
 * The handler defers resolving the AGL start contract until execution
 * time so the step can be registered during plugin `setup()` and still
 * call into the service after `start()` has run.
 */
export const createSmlIndexAttachmentStepDefinition = ({
  getStartContract,
  getSpaces,
}: {
  getStartContract: () => AgentContextLayerPluginStart;
  getSpaces: () => SpacesPluginStart | undefined;
}) =>
  createServerStepDefinition({
    ...smlIndexAttachmentStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = context.input;
        const { originId, attachmentType, action } = input;
        const request = context.contextManager.getFakeRequest();

        const startContract = getStartContract();

        if (action === 'delete') {
          // We do NOT gate on `getTypeDefinition` here: a workflow must be
          // able to clean up chunks it previously wrote even if the
          // plugin that registered the type has since been disabled.
          await startContract.deleteAttachment({
            request,
            originId,
            attachmentType,
            // Workflow steps "own" the origin they wrote — wipe every chunk,
            // not just the crawler-default 'crawled'-only subset.
            ingestionMethod: 'all',
          });
        } else {
          if (!startContract.getTypeDefinition(attachmentType)) {
            return {
              error: new Error(`Unknown SML attachment type: '${attachmentType}'`),
            };
          }

          const chunks: SmlChunk[] = input.chunks.map((chunk) => ({
            type: chunk.type,
            title: chunk.title,
            content: chunk.content,
            ...(chunk.description !== undefined ? { description: chunk.description } : {}),
            ...(chunk.user_id !== undefined ? { user_id: chunk.user_id } : {}),
            ...(chunk.references !== undefined ? { references: chunk.references } : {}),
            ...(chunk.permissions !== undefined ? { permissions: chunk.permissions } : {}),
          }));

          await startContract.indexAttachment({
            request,
            originId,
            attachmentType,
            // Content-mode writes only accept 'create' | 'update' at the
            // start-contract level; both trigger the same idempotent full
            // replace, so we always send 'create' as the canonical value
            // for the user-facing `upsert` action.
            action: 'create',
            content: chunks,
          });
        }

        const spaceId = getSpaces()?.spacesService?.getSpaceId(request) ?? 'default';
        // Reflects the caller-supplied chunk count, not the count of
        // documents Elasticsearch confirms it has written. The indexer
        // logs per-document bulk errors but does not throw — see the
        // output schema's `requestedChunkCount` JSDoc.
        const requestedChunkCount = action === 'delete' ? 0 : input.chunks.length;

        return {
          output: {
            originId,
            attachmentType,
            action,
            spaceId,
            requestedChunkCount,
            acknowledged: true as const,
          },
        };
      } catch (error) {
        context.logger.error(
          'SML index_attachment workflow step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: new Error(
            error instanceof Error ? error.message : 'Failed to index SML attachment'
          ),
        };
      }
    },
  });
