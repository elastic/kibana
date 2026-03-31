/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { resolveSmlAttachItems } from '../../../sml/execute_sml_attach_items';
import type { SmlToolsOptions } from './types';

const smlAttachItemSchema = z.object({
  chunk_id: z
    .string()
    .describe('The chunk_id value from an sml_search result item (identifies the indexed chunk)'),
  attachment_id: z
    .string()
    .describe(
      'The attachment_id value from an sml_search result item (identifies the source asset, e.g. a saved object ID)'
    ),
  attachment_type: z
    .string()
    .describe('The attachment_type value from an sml_search result item (e.g. "visualization")'),
});

const smlAttachSchema = z.object({
  items: z
    .array(smlAttachItemSchema)
    .min(1)
    .max(50)
    .describe(
      'One or more items from sml_search results to attach. ' +
        'Copy chunk_id, attachment_id, and attachment_type exactly as returned by sml_search.'
    ),
});

/**
 * Creates the sml_attach tool.
 * Converts SML search results into conversation attachments.
 */
export const createSmlAttachTool = ({
  getSmlService,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlAttachSchema> => ({
  id: platformCoreTools.smlAttach,
  type: ToolType.builtin,
  description:
    'Attach assets found by sml_search to the conversation. ' +
    'Pass one or more items using the chunk_id, attachment_id, and attachment_type fields exactly as returned by sml_search. ' +
    'Each item is resolved into a full conversation attachment (e.g. a Lens visualization). ' +
    'Items that cannot be resolved return individual errors without failing the entire call.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'SML features require experimental features to be enabled',
          };
    },
  },
  handler: async ({ items }, context) => {
    const smlService = getSmlService();
    const { spaceId, savedObjectsClient, request, attachments, esClient, logger } = context;

    const resolvedItems = await resolveSmlAttachItems({
      items,
      sml: smlService,
      esClient: esClient.asCurrentUser,
      request,
      spaceId,
      savedObjectsClient,
      logger,
    });

    const results = await Promise.all(
      resolvedItems.map(async (r) => {
        if (!r.success) {
          return createErrorResult({
            message: r.message,
            metadata: { chunk_id: r.chunk_id, attachment_type: r.attachment_type },
          });
        }

        const added = await attachments.add(r.attachment, ATTACHMENT_REF_ACTOR.agent);

        return {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            success: true,
            attachment_id: added.id,
            attachment_type: r.attachment.type,
            message: `Attachment '${added.id}' of type '${r.attachment.type}' created from SML item '${r.chunk_id}'`,
          },
        };
      })
    );

    return { results };
  },
});
