/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentBoundedTool } from '@kbn/agent-builder-server/attachments/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { attachmentToResolverBoundedToolSnapshot } from '../../../attachments/resolver_bounded_tool_snapshot';
import type { SmlToolsOptions } from './types';

const smlReadSchema = z.object({
  chunk_ids: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      'One or more chunk_id values exactly as returned by sml_search, or the path after sml:// in a user @-mention link.'
    ),
});

const summarizeBoundedTool = (tool: AttachmentBoundedTool) => ({
  id: tool.id,
  type: tool.type,
  description: tool.description,
  ...('tags' in tool && Array.isArray(tool.tags) && tool.tags.length > 0 ? { tags: tool.tags } : {}),
});

/**
 * Creates the sml_read tool.
 * Resolves SML items like sml_attach but returns formatted representation and bounded tools instead of persisting attachments.
 */
export const createSmlReadTool = ({
  getAgentContextLayer,
  getSmlReadResolverService,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlReadSchema> => ({
  id: platformCoreTools.smlRead,
  type: ToolType.builtin,
  description:
    'Read assets found by sml_search without attaching them to the conversation. ' +
    'Returns the same formatted text the attachment type would show the model (resolver format) plus metadata for any instance-scoped (bounded) tools registered for that type. ' +
    'Use when you need asset context or bounded tool ids before calling sml_attach, or when the user only asked to inspect an asset. ' +
    'Pass chunk_id values exactly as from sml_search or sml:// links (same as sml_attach).',
  schema: smlReadSchema,
  tags: ['sml'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(
        AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID
      );
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'SML features require experimental features to be enabled',
          };
    },
  },
  handler: async ({ chunk_ids: chunkIds }, context) => {
    const agentContextLayer = getAgentContextLayer();
    const resolverService = getSmlReadResolverService();
    const { spaceId, savedObjectsClient, request, esClient, logger } = context;

    const resolvedItems = await agentContextLayer.resolveSmlAttachItems({
      chunkIds,
      esClient,
      request,
      spaceId,
      savedObjectsClient,
      logger,
    });

    const formatContext = { request, spaceId };

    const results = await Promise.all(
      resolvedItems.map(async (r) => {
        if (!r.success) {
          return createErrorResult({
            message: r.message,
            metadata: { chunk_id: r.chunk_id, attachment_type: r.attachment_type },
          });
        }

        const typeDefinition = resolverService.getResolverType(r.attachment.type);
        if (!typeDefinition) {
          return createErrorResult({
            message: `No resolver type definition for SML result type '${r.attachment.type}'`,
            metadata: { chunk_id: r.chunk_id, attachment_type: r.attachment.type },
          });
        }

        const syntheticId = getToolResultId();
        const attachment: Attachment = {
          id: syntheticId,
          type: r.attachment.type,
          data: r.attachment.data,
          ...(r.attachment.origin !== undefined ? { origin: r.attachment.origin } : {}),
        } as Attachment;

        try {
          const formatResult = await typeDefinition.format(
            {
              id: syntheticId,
              type: r.attachment.type,
              data: r.attachment.data,
            },
            formatContext
          );

          let boundedTools: ReturnType<typeof summarizeBoundedTool>[] = [];
          if (typeDefinition.getBoundedTools) {
            try {
              const raw = await typeDefinition.getBoundedTools(
                attachmentToResolverBoundedToolSnapshot(attachment),
                formatContext
              );
              boundedTools = raw.map(summarizeBoundedTool);
            } catch (boundedError) {
              context.logger.warn(
                `sml_read: getBoundedTools failed for chunk '${r.chunk_id}': ${
                  boundedError instanceof Error ? boundedError.message : String(boundedError)
                }`
              );
            }
          }

          return {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              success: true,
              chunk_id: r.chunk_id,
              attachment_type: r.attachment.type,
              format: formatResult,
              bounded_tools: boundedTools,
            },
          };
        } catch (error) {
          logger.error(
            `sml_read: format failed for chunk '${r.chunk_id}' (type: ${r.attachment.type}): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return createErrorResult({
            message: `Failed to format SML item '${r.chunk_id}'`,
            metadata: { chunk_id: r.chunk_id, attachment_type: r.attachment.type },
          });
        }
      })
    );

    return { results };
  },
});
