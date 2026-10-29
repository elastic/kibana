/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_USER_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import { validateAiIndexId } from '@kbn/context-engine-plugin/common/validation';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { aiIndexToolsAvailability } from '../ai_index_tools_availability';
import { getErrorMessage, type AiIndexToolDeps } from '../ai_index_read_service';
import { describeAiIndexHandler } from './handler';

// Enough for MAX_AI_INDEX_DESCRIBE_FIELDS fields plus the counts and example queries.
const MAX_DESCRIBE_RESULT_TOKENS = 16_000;

const describeAiIndexSchema = lazySchema(() =>
  z.object({
    ai_index_id: z
      .string()
      .min(1)
      .max(MAX_AI_INDEX_ID_LENGTH)
      .refine((value) => validateAiIndexId(value) === undefined, {
        message: 'Invalid AI index id.',
      })
      .describe(
        'The AI-index registry ID, as shown in the agent AI INDICES configuration or returned by the list AI Indices tool. Do not use the backing Elasticsearch index or data stream name.'
      ),
    user_id: z
      .string()
      .min(1)
      .max(MAX_AI_INDEX_USER_ID_LENGTH)
      .optional()
      .describe(
        '(Optional) Limits the type and tag counts to documents with this user_id and documents with no user_id. Pass the same value you will pass to the query tool; omit it otherwise.'
      ),
  })
);

export const createDescribeAiIndexTool = (
  deps: AiIndexToolDeps
): BuiltinToolDefinition<typeof describeAiIndexSchema> => ({
  id: contextEngineAiIndexTools.describeAiIndex,
  type: ToolType.builtin,
  tags: ['context_engine'],
  annotations: {
    title: 'Describe AI Index',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Describe one Context Engine AI Index before writing a query for it.
    Returns: what the index holds, the ES|QL target for FROM, its fields (name, type, searchable, aggregatable), document counts by type and tag, and example ES|QL queries.
    Reads only what you are allowed to read in the current space. The space comes from the request (over MCP, from the URL).
  `,
  schema: describeAiIndexSchema,
  availability: aiIndexToolsAvailability,
  maxResultTokens: MAX_DESCRIBE_RESULT_TOKENS,
  handler: async ({ ai_index_id: aiIndexId, user_id: userId }, context) => {
    try {
      const { response } = await describeAiIndexHandler({ deps, aiIndexId, userId, context });
      return { results: [{ type: ToolResultType.other, data: { response } }] };
    } catch (error) {
      const message = getErrorMessage(error);
      context.logger.error(
        `Error running ${contextEngineAiIndexTools.describeAiIndex}: ${message}`,
        { error }
      );
      return { results: [{ type: ToolResultType.error, data: { message } }] };
    }
  },
});
