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
import { aiIndexToolsAvailability } from '../ai_index_tools_availability';
import {
  addConversationReference,
  createMemoryWriter,
  type StoredMemoryDocument,
  updateMemoryProvenance,
} from '../memory_document';

const memoryTypeSchema = z.enum(['memory.session', 'memory.session_fact']);
const DEFAULT_MEMORY_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000;

const rememberSchema = z.object({
  aiIndexId: aiIndexIdFieldSchema.describe(
    'The Context Engine AI-index registry ID where the memory will be stored. Use the ID from the agent AI INDICES configuration, not the backing Elasticsearch index or data stream name.'
  ),
  id: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe('The id of an existing memory to revise. Omit when creating a new memory.'),
  sessionId: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe(
      'For external calls only: omit unless continuing a memory session using the sessionId returned by an earlier remember call. Do not invent a value. Agent Builder calls ignore this input and use the current conversation ID.'
    ),
  type: memoryTypeSchema.describe(
    'Use memory.session_fact for a granular fact discovered during a session, or memory.session for a session synthesis'
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
    .describe(
      'Optional timestamp after which the memory must not be recalled. New memories default to 90 days from creation.'
    ),
});

export const createRememberTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  generateId = randomUUID,
  generateSessionId = randomUUID,
  getCurrentDate = () => new Date(),
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  generateId?: () => string;
  generateSessionId?: () => string;
  getCurrentDate?: () => Date;
}): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: CONTEXT_ENGINE_REMEMBER_TOOL_ID,
  type: ToolType.builtin,
  availability: aiIndexToolsAvailability,
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
    Memory is shared with users and agents that can access this AI index. Only record findings
    useful to others working in this context, such as discovered patterns, effective approaches,
    or domain knowledge. Do not record personal details or individual user preferences.
    Use memory.session_fact for a granular fact discovered during a session.
    Use memory.session for a synthesis of what was tried, what worked, and what should be done
    differently. Omit id to create a memory; provide an id returned by an earlier call only when
    deliberately revising that memory. This tool handles session metadata, conversation references,
    and provenance server-side. For external calls, omit sessionId unless continuing with the
    sessionId returned by an earlier remember call. Agent Builder calls ignore sessionId and use
    the current conversation ID.
  `,
  schema: rememberSchema,
  handler: async (params, context) => {
    const { request, spaceId, esClient, runContext, logger, callContext } = context;
    const agent = getAgentFromRunContext(runContext);
    const conversationId = agent?.conversationId || undefined;

    if (!conversationId && callContext?.callSource !== 'mcp') {
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
      const sessionId = conversationId ?? params.sessionId ?? generateSessionId();

      await assertContextEngineWriteAccess({
        request,
        spaceId,
        getCoreStart,
        getSecurityStart,
      });

      const aiIndex = await (await getAiIndexService()).get(params.aiIndexId, spaceId);
      if (!aiIndex.memory_enabled) {
        throw new Error(`AI index '${params.aiIndexId}' does not have memory enabled.`);
      }
      if (isIndexPattern(aiIndex.dest.value)) {
        throw new Error(
          `AI index '${params.aiIndexId}' uses an index pattern and cannot accept memory writes.`
        );
      }

      const currentUserClient = esClient.asCurrentUser;
      const currentDate = getCurrentDate();
      const now = currentDate.toISOString();
      const defaultExpiresAt = new Date(
        currentDate.getTime() + DEFAULT_MEMORY_EXPIRATION_MS
      ).toISOString();
      const logicalId = params.id ?? generateId();
      const writer = createMemoryWriter({
        toolId: CONTEXT_ENGINE_REMEMBER_TOOL_ID,
        runId: runContext.runId,
        agentId: agent?.agentId,
      });
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
          existingHit._source.type !== 'memory.session' &&
          existingHit._source.type !== 'memory.session_fact'
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
        if (existingHit._source.governance?.lifecycle?.status === 'deleted') {
          throw new Error(`Memory '${params.id}' was deleted and cannot be revised.`);
        }

        existingBackingIndex = existingHit._index;
        existingSeqNo = existingHit._seq_no;
        existingPrimaryTerm = existingHit._primary_term;
        existingDocument = existingHit._source;
      }

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
        ...(params.expires_at !== undefined
          ? { expires_at: params.expires_at }
          : existingDocument?.expires_at !== undefined
          ? { expires_at: existingDocument.expires_at }
          : { expires_at: defaultExpiresAt }),
        updated_at: now,
        references: addConversationReference(existingDocument?.references, conversationId),
        attributes: {
          ...existingDocument?.attributes,
          'memory.session_id': sessionId,
        },
        governance: updateMemoryProvenance(
          existingDocument?.governance,
          writer,
          existingDocument === undefined
        ),
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
            data: { id: logicalId, sessionId },
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
