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

const toolDescription = `Update conversation metadata fields defined by the active template.

The \`## CONVERSATION CONTEXT\` section of your system prompt lists all fields for this conversation (their names, types, descriptions, and current values). Use this tool to write back a field value once you have gathered or inferred it from the conversation.

## When to use it

- As soon as the user provides or confirms a value for a field shown as _not yet set_ in ## CONVERSATION CONTEXT.
- When you can confidently infer a field value from the conversation without asking.
- When a previously set value needs correction based on new information.

## Rules

- Only set keys that appear in the ## CONVERSATION CONTEXT field list.
- Do not hallucinate or assume values — only write a field when you have reliable information.
- Updates merge into existing metadata: earlier values for other keys are preserved.
- You can update multiple keys in a single call.
- Do not call this tool on every round — only when new field values are known.`;

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
