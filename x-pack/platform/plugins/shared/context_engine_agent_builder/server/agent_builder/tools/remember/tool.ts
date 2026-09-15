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
import { randomUUID } from 'crypto';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TAG_LENGTH,
  MAX_KI_TAGS,
  MAX_KI_TITLE_LENGTH,
} from '@kbn/context-engine-plugin/common/step_types/ki';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import { isIndexPattern } from '@kbn/context-engine-plugin/common/ai_index_dest';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { CONTEXT_ENGINE_REMEMBER_TOOL_ID } from '../../../../common/agent_builder_tools';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';

const memoryTypeSchema = z.enum(['memory_session', 'memory_session_fact']);

const rememberSchema = z.object({
  aiIndexId: aiIndexIdFieldSchema.describe(
    'The Context Engine AI index where the memory will be stored'
  ),
  id: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe('The id of an existing memory to revise. Omit when creating a new memory.'),
  type: memoryTypeSchema.describe(
    'Use memory_session_fact for a granular fact discovered during a session, or memory_session for a session synthesis'
  ),
  title: z.string().min(1).max(MAX_KI_TITLE_LENGTH).describe('A short label for the memory'),
  description: z
    .string()
    .min(1)
    .max(MAX_KI_DESCRIPTION_LENGTH)
    .describe('A concise description of the memory and its immediate consequence'),
  content: z
    .string()
    .min(1)
    .max(MAX_KI_CONTENT_LENGTH)
    .describe('Enough context to use the memory without re-deriving it'),
  tags: z
    .array(z.string().min(1).max(MAX_KI_TAG_LENGTH))
    .max(MAX_KI_TAGS)
    .optional()
    .describe('Optional lowercase index names, feature areas, or tools associated with the memory'),
  expires_at: z.iso
    .datetime()
    .optional()
    .describe('Optional timestamp after which the memory must not be recalled'),
});

interface StoredMemoryDocument {
  '@timestamp': string;
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  spaces?: string[];
  expires_at?: string;
  updated_at: string;
  attributes?: Record<string, string | number | boolean | string[]>;
  governance?: {
    lifecycle?: {
      status?: string;
    };
  };
}

export const createRememberTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  generateId = randomUUID,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  generateId?: () => string;
}): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: CONTEXT_ENGINE_REMEMBER_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Remember',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Write a memory to a memory-enabled Context Engine AI index.
    Use memory_session_fact for a granular fact discovered during a session.
    Use memory_session for a synthesis of what was tried, what worked, and what should be done
    differently. Omit id to create a memory; provide an id returned by an earlier call only when
    deliberately revising that memory. This tool handles session and space metadata server-side.
  `,
  schema: rememberSchema,
  handler: async (params, context) => {
    const { request, spaceId, esClient, runContext, logger } = context;
    const conversationId = getAgentFromRunContext(runContext)?.conversationId;

    if (!conversationId) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Cannot store memory outside an Agent Builder conversation.' },
          },
        ],
      };
    }

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
      const now = new Date().toISOString();
      const logicalId = params.id ?? generateId();
      let existingBackingIndex: string | undefined;
      let existingSeqNo: number | undefined;
      let existingPrimaryTerm: number | undefined;
      let existingDocument: StoredMemoryDocument | undefined;

      if (params.id) {
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
          existingHit._source.type !== 'memory_session' &&
          existingHit._source.type !== 'memory_session_fact'
        ) {
          throw new Error(
            `Document '${params.id}' in AI index '${params.aiIndexId}' is not a memory.`
          );
        }
        if (existingHit._source.type !== params.type) {
          throw new Error(
            `Memory '${params.id}' has type '${existingHit._source.type}' and cannot be revised as '${params.type}'.`
          );
        }
        if (!existingHit._source.spaces?.includes(spaceId)) {
          throw new Error(
            `Memory '${params.id}' does not belong to the current space '${spaceId}'.`
          );
        }
        if (existingHit._source.governance?.lifecycle?.status === 'deleted') {
          throw new Error(`Memory '${params.id}' was deleted and cannot be revised.`);
        }

        existingBackingIndex = existingHit._index;
        existingSeqNo = existingHit._seq_no;
        existingPrimaryTerm = existingHit._primary_term;
        existingDocument = existingHit._source;
      }

      const previousRevision = existingDocument?.attributes?.revision;
      const revision = typeof previousRevision === 'number' ? previousRevision + 1 : 1;
      const document: StoredMemoryDocument = {
        '@timestamp':
          aiIndex.dest.type === 'data_stream' ? now : existingDocument?.['@timestamp'] ?? now,
        id: logicalId,
        type: params.type,
        title: params.title,
        description: params.description,
        content: params.content,
        ...(params.tags !== undefined
          ? { tags: params.tags }
          : existingDocument?.tags !== undefined
          ? { tags: existingDocument.tags }
          : {}),
        spaces: [spaceId],
        ...(params.expires_at !== undefined
          ? { expires_at: params.expires_at }
          : existingDocument?.expires_at !== undefined
          ? { expires_at: existingDocument.expires_at }
          : {}),
        updated_at: now,
        attributes: {
          ...existingDocument?.attributes,
          session_id: conversationId,
          session_kind: 'conversation',
          namespace: 'agent_memory',
          revision,
        },
      };

      if (
        aiIndex.dest.type === 'index' &&
        existingDocument &&
        (existingSeqNo === undefined || existingPrimaryTerm === undefined)
      ) {
        throw new Error(`Memory '${logicalId}' is missing concurrency metadata.`);
      }

      await currentUserClient.index({
        index:
          aiIndex.dest.type === 'index' && existingBackingIndex
            ? existingBackingIndex
            : aiIndex.dest.value,
        ...(aiIndex.dest.type === 'index' && { id: logicalId }),
        document,
        ...(aiIndex.dest.type === 'data_stream' || !existingDocument
          ? { op_type: 'create' as const }
          : {
              if_seq_no: existingSeqNo,
              if_primary_term: existingPrimaryTerm,
            }),
        refresh: 'wait_for',
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { id: logicalId, revision },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${CONTEXT_ENGINE_REMEMBER_TOOL_ID}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to store memory: ${message}` },
          },
        ],
      };
    }
  },
});
