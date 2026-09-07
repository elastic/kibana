/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools, createBadRequestError } from '@kbn/agent-builder-common';
import type { ConversationTemplate, MetadataFieldValue } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';

// Bound string and array sizes to prevent unbounded-input DoS.
const MAX_STRING_VALUE = 10_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_ARRAY_ITEM_LENGTH = 2_000;

const setConversationMetadataSchema = z.object({
  metadata: z
    .record(
      z.string(),
      z.union([
        z.string().max(MAX_STRING_VALUE),
        z.number(),
        z.boolean(),
        z.array(z.string().max(MAX_ARRAY_ITEM_LENGTH)).max(MAX_ARRAY_ITEMS),
      ])
    )
    .describe(
      `Key/value pairs to merge into the conversation metadata. Use a string for TEXT, SELECT, DATE, and USER fields. Use a number for NUMBER fields. Use a boolean (true or false) for TOGGLE fields. Use an array of strings for TEXT_ARRAY fields. Existing keys not included here are left unchanged. Pass an empty string as the value to clear a specific string key.`
    ),
});

const toolDescription = `Update conversation metadata fields defined by the active template.

The \`## CONVERSATION METADATA\` section of your system prompt lists all fields for this conversation (their names, types, descriptions, and current values). Use this tool to write back a field value once you have gathered or inferred it from the conversation.

## When to use it

- As soon as the user provides or confirms a value for a field shown as _not yet set_ in ## CONVERSATION METADATA.
- When you can confidently infer a field value from the conversation without asking.
- When a previously set value needs correction based on new information.

## Rules

- Only set keys that appear in the ## CONVERSATION METADATA field list.
- For SELECT fields, only use values from the listed options.
- For TEXT_ARRAY fields, provide an array of strings (even if there is only one value).
- Do not hallucinate or assume values — only write a field when you have reliable information.
- Updates merge into existing metadata: earlier values for other keys are preserved.
- You can update multiple keys in a single call.
- Do not call this tool on every round — only when new field values are known.`;

export const createSetConversationMetadataTool = ({
  updateConversationMetadata,
  template,
}: {
  updateConversationMetadata: (updates: Record<string, MetadataFieldValue>) => Promise<unknown>;
  template: ConversationTemplate;
}): BuiltinToolDefinition<typeof setConversationMetadataSchema> => ({
  id: internalTools.setConversationMetadata,
  type: ToolType.builtin,
  description: toolDescription,
  schema: setConversationMetadataSchema,
  tags: ['internal'],
  excludeFromMcp: true,
  handler: async ({ metadata }) => {
    // Reject unknown keys before delegating to patchMetadata.
    for (const key of Object.keys(metadata)) {
      if (!template.fields[key]) {
        throw createBadRequestError(`Template "${template.id}" has no field "${key}"`);
      }
    }

    await updateConversationMetadata(metadata);

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: { acknowledged: true, updated_keys: Object.keys(metadata) },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => toolReturn.results,
});
