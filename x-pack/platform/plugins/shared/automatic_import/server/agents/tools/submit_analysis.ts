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

interface CreateSubmitToolConfig {
  name: string;
  description: string;
  stateField: string;
  contentLabel: string;
  contentDescription: string;
  summaryDescription: string;
}

export const createSubmitTool = (config: CreateSubmitToolConfig): DynamicStructuredTool => {
  const schema = z.object({
    content: z.string().describe(config.contentDescription),
    summary: z.string().describe(config.summaryDescription),
  });

  return new DynamicStructuredTool({
    name: config.name,
    description: config.description,
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      toolConfig?: ToolRunnableConfig
    ) => {
      return new Command({
        update: {
          [config.stateField]: input.content,
          messages: [
            new ToolMessage({
              content: `${config.contentLabel} stored. Summary: ${input.summary}`,
              tool_call_id: toolConfig?.toolCall?.id ?? '',
            }),
          ],
        },
      });
    },
  });
};

export const submitAnalysisTool = (): DynamicStructuredTool =>
  createSubmitTool({
    name: 'submit_analysis',
    description:
      'Submit your completed analysis. Stores the full analysis in shared state for the ' +
      'pipeline generator and returns a summary to the orchestrator. ' +
      'You MUST call this as your final action after composing your analysis.',
    stateField: 'analysis',
    contentLabel: 'Analysis',
    contentDescription: 'The complete log format analysis in markdown format',
    summaryDescription:
      'A concise 2-4 sentence summary of key findings: format type, number of fields found, number of ECS mappings, notable edge cases',
  });
