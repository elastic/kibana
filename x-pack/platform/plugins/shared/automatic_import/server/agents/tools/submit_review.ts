/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod/v4';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { FIELD_MAPPING_TYPES } from '../state';

const fieldMappingSchema = z.object({
  name: z
    .string()
    .describe('Flattened dot-notation path to the field (e.g. "myintegration.myds.src_port")'),
  type: z
    .enum(FIELD_MAPPING_TYPES)
    .describe(
      'Elasticsearch field type: "keyword" for strings, "long" for numbers, "ip" for IP addresses, "date" for date values'
    ),
});

export const submitReviewTool = (): DynamicStructuredTool => {
  const schema = z.object({
    content: z
      .string()
      .describe('The complete review with all issues, details, and recommendations'),
    summary: z
      .string()
      .describe(
        'A concise summary: PASSED or FAILED, number of issues, severity, and which agent should address them'
      ),
    field_mappings: z
      .array(fieldMappingSchema)
      .optional()
      .describe(
        'Field mappings for custom (non-ECS) fields only — fields under <integration>.<datastream>.*. ' +
          'Required when review PASSES. Each entry maps a flattened field path to its Elasticsearch type. ' +
          'Only use types: "keyword" (strings), "long" (numbers), "ip" (IP addresses), "date" (dates). ' +
          'Do NOT include ECS fields, @timestamp, or fields outside the custom namespace.'
      ),
  });

  return new DynamicStructuredTool({
    name: 'submit_review',
    description:
      'Submit your completed review. Stores the full review in shared state and returns ' +
      'a summary to the orchestrator. When the review PASSES, you MUST also provide ' +
      'field_mappings for all custom-namespaced fields. ' +
      'You MUST call this as your final action after completing your review.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      toolConfig?: ToolRunnableConfig
    ) => {
      const update: Record<string, unknown> = {
        review: input.content,
      };

      if (input.field_mappings && input.field_mappings.length > 0) {
        update.field_mappings = input.field_mappings;
      }

      return new Command({
        update: {
          ...update,
          messages: [
            new ToolMessage({
              content: `Review stored. Summary: ${input.summary}`,
              tool_call_id: toolConfig?.toolCall?.id ?? '',
            }),
          ],
        },
      });
    },
  });
};
