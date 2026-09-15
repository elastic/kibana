/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import { isIndexPattern } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { MAX_KI_ID_LENGTH } from '@kbn/context-engine-plugin/common/step_types/ki';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { CONTEXT_ENGINE_FORGET_TOOL_ID } from '../../../../common/agent_builder_tools';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import {
  createMemoryWriter,
  type StoredMemoryDocument,
  updateMemoryProvenance,
} from '../memory_document';

const forgetSchema = z.object({
  aiIndexId: aiIndexIdFieldSchema.describe('The Context Engine AI index containing the memory'),
  id: z.string().min(1).max(MAX_KI_ID_LENGTH).describe('The id of the memory to remove'),
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
  id: CONTEXT_ENGINE_FORGET_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Forget',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  confirmation: { askUser: 'always' },
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

      const aiIndex = await (await getAiIndexService()).get(params.aiIndexId);
      if (!aiIndex.memory_enabled) {
        throw new Error(`AI index '${params.aiIndexId}' does not have memory enabled.`);
      }
      if (isIndexPattern(aiIndex.dest.value)) {
        throw new Error(
          `AI index '${params.aiIndexId}' uses an index pattern and cannot accept memory writes.`
        );
      }

      const currentUserClient = esClient.asCurrentUser;
      const searchResponse = await currentUserClient.search<StoredMemoryDocument>({
        index: aiIndex.dest.value,
        ignore_unavailable: true,
        allow_no_indices: true,
        ...(aiIndex.dest.type === 'data_stream'
          ? {
              query: { term: { id: params.id } },
              sort: [{ '@timestamp': 'desc' as const }],
              size: 1,
            }
          : {
              query: { ids: { values: [params.id] } },
              seq_no_primary_term: true,
              size: 2,
            }),
      });

      if (aiIndex.dest.type === 'index' && searchResponse.hits.hits.length > 1) {
        throw new Error(
          `Memory '${params.id}' exists in multiple indices matched by AI index '${params.aiIndexId}'.`
        );
      }

      const [existingHit] = searchResponse.hits.hits;
      if (!existingHit?._source) {
        throw new Error(`Memory '${params.id}' was not found in AI index '${params.aiIndexId}'.`);
      }
      if (
        existingHit._source.type !== 'memory.session' &&
        existingHit._source.type !== 'memory.session_fact'
      ) {
        throw new Error(
          `Document '${params.id}' in AI index '${params.aiIndexId}' is not a memory.`
        );
      }

      if (existingHit._source.governance?.lifecycle?.status === 'deleted') {
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
      const writer = createMemoryWriter({
        toolId: CONTEXT_ENGINE_FORGET_TOOL_ID,
        runId: runContext.runId,
        agentId: agent?.agentId,
      });
      const tombstoneDocument: StoredMemoryDocument = {
        ...existingHit._source,
        '@timestamp': aiIndex.dest.type === 'data_stream' ? now : existingHit._source['@timestamp'],
        updated_at: now,
        governance: {
          ...updateMemoryProvenance(existingHit._source.governance, writer, false),
          lifecycle: {
            ...existingHit._source.governance?.lifecycle,
            status: 'deleted',
          },
        },
      };

      if (
        aiIndex.dest.type === 'index' &&
        (existingHit._seq_no === undefined || existingHit._primary_term === undefined)
      ) {
        throw new Error(`Memory '${params.id}' is missing concurrency metadata.`);
      }

      await currentUserClient.index({
        index: aiIndex.dest.type === 'index' ? existingHit._index : aiIndex.dest.value,
        ...(aiIndex.dest.type === 'index' && {
          id: params.id,
          if_seq_no: existingHit._seq_no,
          if_primary_term: existingHit._primary_term,
        }),
        document: tombstoneDocument,
        ...(aiIndex.dest.type === 'data_stream' && { op_type: 'create' as const }),
        refresh: 'wait_for',
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
      logger.error(`Error running ${CONTEXT_ENGINE_FORGET_TOOL_ID}: ${message}`, { error });
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
