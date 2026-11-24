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
import {
  MAX_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
} from '@kbn/context-engine-plugin/common/constants';
import {
  auditFailureForResult,
  sessionMemoryForgetAuditEvent,
} from '@kbn/context-engine-plugin/server/audit/audit_events';
import type {
  ForgetResult,
  SessionMemoryService,
} from '@kbn/context-engine-plugin/server/session_memory/types';
import { toError } from '@kbn/context-engine-plugin/server/routes/memory_user';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getCallerProfileId } from '../memory_caller';
import { nonBlankStringSchema } from '../non_blank_string_schema';

const forgetSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(nonBlankStringSchema(MAX_MEMORY_ID_LENGTH))
      .min(1)
      .max(MAX_SESSION_MEMORY_FORGET_IDS)
      .describe('The ids of the memories to forget, as returned by the remember tool.'),
  })
);

export const createForgetTool = ({
  getSessionMemoryService,
  getCoreStart,
  getSecurityStart,
}: {
  getSessionMemoryService: () => Promise<SessionMemoryService>;
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
    Forget short-term memories of the current user in this space so they are no longer recalled.
    Provide the ids returned by the remember tool. Each id gets an outcome: forgotten,
    already_forgotten, not_found, or failed. The change may not show in recall right after this
    call, and a memory written moments ago may report not_found.
  `,
  schema: forgetSchema,
  handler: async ({ ids }, context) => {
    const { request, spaceId, logger } = context;
    const uniqueIds = [...new Set(ids)];
    let coreStart: CoreStart | undefined;
    let userId: string | undefined;

    const audit = (memoryId: string, failure?: 'not_found' | Error) =>
      coreStart?.security.audit
        .asScoped(request)
        .log(sessionMemoryForgetAuditEvent({ memoryId, targetUserId: userId, failure }));

    try {
      await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });
      coreStart = await getCoreStart();

      let results: ForgetResult[];
      try {
        userId = await getCallerProfileId({ coreStart, request });
        results = await (
          await getSessionMemoryService()
        ).forget({ space: spaceId, userId }, uniqueIds);
      } catch (error) {
        const failure = toError(error);
        uniqueIds.forEach((memoryId) => audit(memoryId, failure));
        throw error;
      }

      results.forEach((result) => audit(result.id, auditFailureForResult(result)));
      return { results: [{ type: ToolResultType.other, data: { results } }] };
    } catch (error) {
      const { message } = toError(error);
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
