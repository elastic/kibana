/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';

const setConversationMetadataSchema = z.object({
  updates: z
    .record(z.string(), z.string())
    .describe(
      'Key/value pairs to merge into the conversation metadata. ' +
        'Existing keys not included here are left unchanged. ' +
        'Pass an empty string as the value to clear a specific key.'
    ),
});

const toolDescription = `Update conversation metadata key/value pairs.

Use this tool when you have gathered or inferred structured context about the conversation that was requested by a conversation template (e.g. affected component, environment, severity). The keys and expected values are described in the ## CONVERSATION CONTEXT section of your system prompt.

## When to use it

- After the user provides a value that fills a template field listed in ## CONVERSATION CONTEXT.
- When you can confidently infer a metadata value from available information.

## Rules

- Only set keys that are defined in the ## CONVERSATION CONTEXT section.
- Do not hallucinate values — only set keys when you have reliable information.
- Updates are merged: you may call this tool multiple times; earlier values are not removed unless you overwrite them.
- Do not call this tool on every round — only when new values are known.`;

export const createSetConversationMetadataTool = ({
  updateConversationMetadata,
}: {
  updateConversationMetadata: (updates: Record<string, string>) => Promise<void>;
}): BuiltinToolDefinition<typeof setConversationMetadataSchema> => ({
  id: internalTools.setConversationMetadata,
  type: ToolType.builtin,
  description: toolDescription,
  schema: setConversationMetadataSchema,
  tags: ['internal'],
  handler: async ({ updates }) => {
    await updateConversationMetadata(updates);
    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: { acknowledged: true, updated_keys: Object.keys(updates) },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => toolReturn.results,
});
