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
import { randomUUID } from 'crypto';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_MEMORY_AI_INDEX_IDS,
  MAX_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import { assertAiIndicesWritable } from '@kbn/context-engine-plugin/server/ai_indices/assert_ai_indices_writable';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { sessionMemoryRememberAuditEvent } from '@kbn/context-engine-plugin/server/audit/audit_events';
import { toError } from '@kbn/context-engine-plugin/server/routes/memory_user';
import type { SessionMemoryService } from '@kbn/context-engine-plugin/server/session_memory/types';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import {
  createMemoryToolsAvailability,
  isContextEngineMemoryEnabled,
} from '../ai_index_tools_availability';
import { getCallerProfileId } from '../memory_caller';
import { nonBlankStringSchema } from '../non_blank_string_schema';

const rememberSchema = lazySchema(() =>
  z.object({
    id: nonBlankStringSchema(MAX_MEMORY_ID_LENGTH)
      .optional()
      .describe(
        'The id of an existing memory to revise. The revision replaces that memory in full. Omit when creating a new memory.'
      ),
    sessionId: nonBlankStringSchema(MAX_MEMORY_ID_LENGTH)
      .optional()
      .describe(
        'For MCP calls only: omit unless continuing a memory session using the sessionId returned by an earlier remember call. Do not invent a value. Agent Builder calls ignore this input and use the current conversation ID.'
      ),
    content: nonBlankStringSchema(MAX_KI_CONTENT_LENGTH).describe(
      'Enough context to use the memory without re-deriving it'
    ),
    aiIndexIds: z
      .array(aiIndexIdFieldSchema)
      .max(MAX_MEMORY_AI_INDEX_IDS)
      .optional()
      .describe(
        'Context Engine AI-index registry IDs from the agent AI INDICES configuration, not backing Elasticsearch index or data stream names. Dreaming promotes the memory into these AI indices later.'
      ),
    attributes: z
      .record(
        nonBlankStringSchema(MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH),
        z.string().max(MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH)
      )
      .refine((attributes) => Object.keys(attributes).length <= MAX_SESSION_MEMORY_ATTRIBUTES, {
        message: `Must have at most ${MAX_SESSION_MEMORY_ATTRIBUTES} attributes`,
      })
      .optional()
      .describe('String hints about the memory for dreaming, as key-value pairs.'),
  })
);

export const createRememberTool = ({
  getAiIndexService,
  getSessionMemoryService,
  getCoreStart,
  getSecurityStart,
  generateId = randomUUID,
  generateSessionId = randomUUID,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getSessionMemoryService: () => Promise<SessionMemoryService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  generateId?: () => string;
  generateSessionId?: () => string;
}): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: contextEngineMemoryTools.remember,
  type: ToolType.builtin,
  availability: createMemoryToolsAvailability(getCoreStart),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Remember',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Save a short-term memory for the current user in this space. Record what is worth keeping
    from this session, such as a discovered fact, an approach that worked, or what to do
    differently next time. The memory is not written to an AI index directly. Dreaming may later promote it into the AI indices listed in aiIndexIds.
    The write runs in the background, so recalling the memory right after this call may miss it.
    Pass id to revise a memory, which replaces it in full. For MCP calls, omit sessionId unless
    continuing with the sessionId returned by an earlier remember call.
  `,
  schema: rememberSchema,
  handler: async (params, context) => {
    const { request, spaceId, esClient, runContext, logger, callContext } = context;
    const conversationId = getAgentFromRunContext(runContext)?.conversationId || undefined;

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

    const sessionId = conversationId ?? params.sessionId ?? generateSessionId();
    const revision = params.id !== undefined;
    const aiIndexIds = [...new Set(params.aiIndexIds)];
    let coreStart: CoreStart | undefined;
    let userId: string | undefined;

    const audit = (outcome: { memoryId?: string; error?: Error }) =>
      coreStart?.security.audit.asScoped(request).log(
        sessionMemoryRememberAuditEvent({
          sessionId,
          targetUserId: userId,
          revision,
          ...outcome,
        })
      );

    try {
      await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });
      coreStart = await getCoreStart();

      if (!(await isContextEngineMemoryEnabled({ coreStart, request }))) {
        throw new Error('Context Engine memory is disabled.');
      }

      let service: SessionMemoryService;
      try {
        userId = await getCallerProfileId({ coreStart, request });
        await assertAiIndicesWritable({
          aiIndexService: await getAiIndexService(),
          esClient: esClient.asCurrentUser,
          spaceId,
          aiIndexIds,
        });
        service = await getSessionMemoryService();
      } catch (error) {
        audit({ memoryId: params.id, error: toError(error) });
        throw error;
      }

      const scope = { space: spaceId, userId };
      const memoryId = params.id ?? generateId();
      const writeInBackground = async () => {
        try {
          await service.remember(scope, {
            id: memoryId,
            sessionId,
            content: params.content,
            aiIndexIds,
            attributes: params.attributes,
          });
          audit({ memoryId });
        } catch (error) {
          const normalizedError = toError(error);
          logger.error(
            `Failed to remember session memory [id=${memoryId}]: ${normalizedError.message}`
          );
          audit({ memoryId, error: normalizedError });
        }
      };
      void writeInBackground();

      return {
        results: [{ type: ToolResultType.other, data: { id: memoryId, sessionId } }],
      };
    } catch (error) {
      const message = toError(error).message;
      logger.error(`Error running ${contextEngineMemoryTools.remember}: ${message}`, { error });
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
