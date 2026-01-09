/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { ToolMessage } from '@langchain/core/messages';
import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { z } from '@kbn/zod';

import type { AutomaticImportAgentState } from '../state';

export function fetchCurrentPipelineTool(): DynamicStructuredTool {
  const schema = z.object({});

  return new DynamicStructuredTool({
    name: 'fetch_current_pipeline',
    description:
      'Retrieves the current ingest pipeline stored in state. Use this to inspect the latest pipeline definition.',
    schema,
    func: async (
      _input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
      const currentPipeline = state.current_pipeline ?? {};
      const hasPipeline = Object.keys(currentPipeline).length > 0;

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({
                current_pipeline: currentPipeline,
                has_pipeline: hasPipeline,
                message: hasPipeline
                  ? 'Current pipeline retrieved successfully.'
                  : 'No current pipeline available in state.',
              }),
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    },
  });
}
