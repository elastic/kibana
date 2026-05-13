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
 * Always uses **direct mode** — the workflow author supplies `chunks`
 * (for `create`/`update`), and the start contract's `indexAttachment`
 * forwards them to the indexer, bypassing the registered type's
 * `getSmlData` hook. `delete` only requires the origin/type identifiers.
 *
 * The handler defers resolving the AGL start contract until execution time,
 * so the step can be registered during plugin `setup()` and still call into
 * the service after `start()` has run.
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

        if (!startContract.getTypeDefinition(attachmentType)) {
          return {
            error: new Error(`Unknown SML attachment type: '${attachmentType}'`),
          };
        }

        if (action === 'delete') {
          // Workflow surface is always a `direct` operation: workflow-driven
          // deletes wipe any chunks for the origin regardless of crawler state.
          await startContract.indexAttachment({
            request,
            originId,
            attachmentType,
            action: 'delete',
            source: 'direct',
          });
        } else {
          // We deliberately do NOT forward `permissions` — the indexer
          // derives the authoritative `permissions` (and `spaces`) for each
          // chunk from the registered type's `resolveOriginAccess` hook.
          // See `SmlTypeDefinition.resolveOriginAccess` for the rationale.
          const chunks: SmlChunk[] = input.chunks.map((chunk) => ({
            type: chunk.type,
            title: chunk.title,
            content: chunk.content,
            ...(chunk.description !== undefined ? { description: chunk.description } : {}),
            ...(chunk.user_id !== undefined ? { user_id: chunk.user_id } : {}),
            ...(chunk.references !== undefined ? { references: chunk.references } : {}),
          }));

          await startContract.indexAttachment({
            request,
            originId,
            attachmentType,
            action,
            chunks,
            source: 'direct',
          });
        }

        const spaceId = getSpaces()?.spacesService?.getSpaceId(request) ?? 'default';
        const chunkCount = action === 'delete' ? 0 : input.chunks.length;

        return {
          output: {
            originId,
            attachmentType,
            action,
            spaceId,
            chunkCount,
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
