/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import { MAX_KI_ID_LENGTH } from '@kbn/context-engine-plugin/common/step_types/ki';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import {
  getKiRevision,
  writeKiRevision,
  isKiDeleted,
  type KiWriter,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getWritableMemoryAiIndex } from '../get_writable_memory_ai_index';
import { createMemoryWriter, isMemoryDocument } from '../memory_document';

const forgetSchema = z.object({
  aiIndexId: aiIndexIdFieldSchema.describe(
    'The Context Engine AI-index registry ID containing the memory. Use the ID from the agent AI INDICES configuration, not the backing Elasticsearch index or data stream name.'
  ),
  id: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .describe('The ID of the existing memory to mark as deleted'),
});

export const createForgetTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): BuiltinToolDefinition<typeof forgetSchema> => ({
  id: contextEngineMemoryTools.forget,
  type: ToolType.builtin,
  availability: createMemoryToolsAvailability(getCoreStart),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Forget',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Mark a memory as deleted in a memory-enabled Context Engine AI index so it is no longer
    recalled. Provide the id returned by the remember tool. The memory remains stored as a
    lifecycle tombstone.
  `,
  schema: forgetSchema,
  handler: async (params, context) => {
    const { request, spaceId, esClient, runContext, logger } = context;

    try {
      await assertContextEngineWriteAccess({
        request,
        spaceId,
        getCoreStart,
        getSecurityStart,
      });

      const aiIndex = await getWritableMemoryAiIndex({
        aiIndexId: params.aiIndexId,
        spaceId,
        request,
        getAiIndexService,
        getCoreStart,
      });

      const currentUserClient = esClient.asCurrentUser;
      const abortSignal = new AbortController().signal;

      const revision = await getKiRevision({
        esClient: currentUserClient,
        aiIndexId: params.aiIndexId,
        dest: aiIndex.dest,
        kiId: params.id,
        abortSignal,
        includeSource: true,
      });

      if (!isMemoryDocument(revision.source)) {
        throw new Error(
          `Document '${params.id}' in AI index '${params.aiIndexId}' is not a memory.`
        );
      }
      if (isKiDeleted(revision.source)) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { id: params.id },
            },
          ],
        };
      }

      const now = new Date().toISOString();
      const agent = getAgentFromRunContext(runContext);
      const writer: KiWriter = createMemoryWriter({
        toolId: contextEngineMemoryTools.forget,
        runId: runContext.runId,
        agentId: agent?.agentId,
      });
      const changes = {
        updated_at: now,
        governance: {
          provenance: { updated_by: writer },
          lifecycle: { status: 'deleted' as const },
        },
      };

      await writeKiRevision({
        esClient: currentUserClient,
        aiIndexId: params.aiIndexId,
        dest: aiIndex.dest,
        kiId: params.id,
        revision,
        changes,
        refresh: true,
        abortSignal,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { id: params.id },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.forget}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to forget memory: ${message}` },
          },
        ],
      };
    }
  },
});
