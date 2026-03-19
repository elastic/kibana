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
import { z } from '@kbn/zod';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';

export function submitReviewTool(): DynamicStructuredTool {
  const schema = z.object({
    full_review: z
      .string()
      .describe(
        'The complete review with all issues, details, and recommendations'
      ),
    summary: z
      .string()
      .describe(
        'A concise summary: PASSED or FAILED, number of issues, severity, and which agent should address them'
      ),
  });

  return new DynamicStructuredTool({
    name: 'submit_review',
    description:
      'Submit your completed review. Stores the full review in shared state and returns ' +
      'a summary to the orchestrator. ' +
      'You MUST call this as your final action after completing your review.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      return new Command({
        update: {
          review: input.full_review,
          messages: [
            new ToolMessage({
              content: `Review stored. Summary: ${input.summary}`,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    },
  });
}
