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

export function submitAnalysisTool(): DynamicStructuredTool {
  const schema = z.object({
    full_analysis: z
      .string()
      .describe('The complete log format analysis in markdown format'),
    summary: z
      .string()
      .describe(
        'A concise 2-4 sentence summary of key findings: format type, number of fields found, number of ECS mappings, notable edge cases'
      ),
  });

  return new DynamicStructuredTool({
    name: 'submit_analysis',
    description:
      'Submit your completed analysis. Stores the full analysis in shared state for the ' +
      'pipeline generator and returns a summary to the orchestrator. ' +
      'You MUST call this as your final action after composing your analysis.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      return new Command({
        update: {
          analysis: input.full_analysis,
          messages: [
            new ToolMessage({
              content: `Analysis stored. Summary: ${input.summary}`,
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    },
  });
}
