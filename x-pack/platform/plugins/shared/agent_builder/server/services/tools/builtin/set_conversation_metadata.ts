/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools, createBadRequestError } from '@kbn/agent-builder-common';
import type { ConversationTemplate, SerializedMetadataValue } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import { validateMetadataUpdate } from '../../conversation/templates/validation';
import { serializeMetadataValue } from '../../conversation/templates/serialize';
import {
  MAX_STRING_VALUE,
  MAX_ARRAY_ITEMS,
  MAX_ARRAY_ITEM_LENGTH,
  MAX_OBJECT_ARRAY_ITEMS,
} from '../../conversation/templates/limits';

/**
 * Coarse zod schema for the tool's `metadata` argument.
 *
 * This is intentionally permissive — it bounds size to prevent DoS but does not
 * enforce the per-field structural shape declared by the template. Precise validation
 * (including nested OBJECT / OBJECT_ARRAY shapes) is delegated to
 * `validateMetadataUpdate`, which compiles the template's field definitions to zod
 * and runs them against each value.
 *
 * A recursive JSON-object type is built with `z.lazy` to allow arbitrarily nested
 * objects in OBJECT / OBJECT_ARRAY fields. The type annotation `z.ZodType<JsonValue>`
 * breaks the circular type inference that would otherwise cause a TS error.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(MAX_STRING_VALUE),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(MAX_OBJECT_ARRAY_ITEMS),
    z.record(z.string(), jsonValueSchema),
  ])
);

const setConversationMetadataSchema = z.object({
  metadata: z
    .record(
      z.string(),
      z.union([
        z.string().max(MAX_STRING_VALUE),
        z.number(),
        z.boolean(),
        z.array(z.string().max(MAX_ARRAY_ITEM_LENGTH)).max(MAX_ARRAY_ITEMS),
        // OBJECT and OBJECT_ARRAY fields — any nested JSON structure is accepted here;
        // the compiled per-field schema from validateMetadataUpdate enforces the exact shape.
        z.record(z.string(), jsonValueSchema),
        z.array(z.record(z.string(), jsonValueSchema)).max(MAX_OBJECT_ARRAY_ITEMS),
      ])
    )
    .describe(
      `Key/value pairs to merge into the conversation metadata. Use a string for TEXT, SELECT, DATE, and USER fields. Use a number for NUMBER fields. Use a boolean (true or false) for TOGGLE fields. Use an array of strings for TEXT_ARRAY fields. Use a plain object for OBJECT fields — writing an object replaces the previous value wholesale (no deep merge). Use an array of plain objects for OBJECT_ARRAY fields. Existing keys not included here are left unchanged. Pass an empty string as the value to clear a specific string key.`
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
- For OBJECT fields, provide a plain JSON object whose keys match the declared properties. Writing an object **replaces** the previous value wholesale — there is no deep merge.
- For OBJECT_ARRAY fields, provide an array of plain JSON objects. Each element must conform to the declared properties. Writing the array replaces all previous elements.
- Do not hallucinate or assume values — only write a field when you have reliable information.
- Updates merge into existing metadata: earlier values for other keys are preserved.
- You can update multiple keys in a single call.
- Do not call this tool on every round — only when new field values are known.`;

export const createSetConversationMetadataTool = ({
  updateConversationMetadata,
  template,
}: {
  updateConversationMetadata: (updates: Record<string, SerializedMetadataValue>) => Promise<void>;
  template: ConversationTemplate;
}): InternalBuiltinToolDefinition<typeof setConversationMetadataSchema> => ({
  id: internalTools.setConversationMetadata,
  type: ToolType.builtin,
  description: toolDescription,
  schema: setConversationMetadataSchema,
  tags: ['internal'],
  excludeFromMcp: true,
  handler: async ({ metadata }) => {
    // Reject unknown keys first.
    for (const key of Object.keys(metadata)) {
      if (!template.fields[key]) {
        throw createBadRequestError(`Template "${template.id}" has no field "${key}"`);
      }
    }

    // Validate all values in one pass — throws with accumulated per-field errors.
    validateMetadataUpdate(template.id, template.fields, metadata);

    // Serialize each value to the storage representation.
    // Cast to MetadataFieldValue — the zod coarse schema permits null inside nested objects
    // (via jsonValueSchema) but the template validation above guarantees the shape matches
    // the declared properties, where null is not a valid leaf type. This cast is safe
    // because any null-bearing value would have been rejected by validateMetadataUpdate.
    const serialized = Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => {
        const def = template.fields[k];
        return [
          k,
          serializeMetadataValue(
            v as import('@kbn/agent-builder-common').MetadataFieldValue,
            def.input_type
          ),
        ];
      })
    );

    await updateConversationMetadata(serialized);

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
