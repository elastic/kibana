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
import { MAX_SESSION_MEMORY_ID_LENGTH } from '@kbn/context-engine-plugin/common/constants';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getSessionMemoryScope } from '../session_memory_scope';

const forgetSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_ID_LENGTH)
      .describe('The id of the memory to forget, as returned by the remember or recall tool'),
  })
);

export const createForgetTool = ({
  getContextEngineStart,
  getCoreStart,
  getSecurityStart,
}: {
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
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
    Forget one of the current user's memories, so it is no longer recalled. Use it when the user
    asks you to forget something or a memory is no longer true. Pass the id returned by the
    remember or recall tool; find it with recall first when you don't have it. The outcome is
    forgotten, already_forgotten, or not_found.
  `,
  schema: forgetSchema,
  handler: async ({ id }, context) => {
    const { request, spaceId, logger } = context;

    try {
      await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });
      const scope = await getSessionMemoryScope({ request, spaceId, getCoreStart });
      const outcomes = await (await getContextEngineStart())
        .getSessionMemoryService()
        .forget(scope, [id]);

      return { results: [{ type: ToolResultType.other, data: { id, outcome: outcomes[id] } }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.forget}: ${message}`, { error });
      return {
        results: [
          { type: ToolResultType.error, data: { message: `Failed to forget memory: ${message}` } },
        ],
      };
    }
  },
});
