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
import { z } from '@kbn/zod/v4';

import type { AutomaticImportAgentStateType } from '../state';
import { formatPipelineToc } from './pipeline_constants';

export function fetchCurrentPipelineTool(): DynamicStructuredTool {
  const schema = z.object({
    start_index: z
      .number()
      .optional()
      .describe('Start processor index (0-based, inclusive). Omit to return all processors.'),
    end_index: z
      .number()
      .optional()
      .describe(
        'End processor index (0-based, inclusive). Omit to return from start_index to end.'
      ),
  });

  return new DynamicStructuredTool({
    name: 'fetch_pipeline',
    description:
      'Retrieves the current ingest pipeline from state. ' +
      'Use optional start_index/end_index to fetch a specific range of processors instead of the full pipeline. ' +
      'Full pipeline requests include a table of contents; range requests return only the requested processors. ' +
      'Use this only when you need to inspect processor details for modification — ' +
      'the pipeline table of contents is already returned after every modify_pipeline call. ' +
      'Do NOT call this on review iterations when the full pipeline is already injected in your context.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput<AutomaticImportAgentStateType>();
      const currentPipeline = state.current_pipeline ?? {};
      const processors = (currentPipeline as Record<string, unknown>).processors;
      const hasPipeline = Array.isArray(processors) && processors.length > 0;

      if (!hasPipeline) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: JSON.stringify({
                  has_pipeline: false,
                  message: 'No current pipeline available in state.',
                }),
                tool_call_id: config?.toolCall?.id ?? '',
              }),
            ],
          },
        });
      }

      const allProcessors = processors as Array<Record<string, unknown>>;
      const { start_index: startIndex, end_index: endIndex } = input;
      const hasRange = startIndex != null || endIndex != null;

      const result: Record<string, unknown> = {
        has_pipeline: true,
        total_processors: allProcessors.length,
      };

      if (hasRange) {
        const sliceStart = startIndex ?? 0;
        const sliceEnd = endIndex != null ? endIndex + 1 : allProcessors.length;
        const clampedStart = Math.max(0, Math.min(sliceStart, allProcessors.length));
        const clampedEnd = Math.max(clampedStart, Math.min(sliceEnd, allProcessors.length));
        result.range = { start: clampedStart, end: clampedEnd - 1 };
        result.processors = allProcessors.slice(clampedStart, clampedEnd);
      } else {
        result.pipeline_toc = formatPipelineToc(allProcessors);
        result.current_pipeline = currentPipeline;
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify(result),
              tool_call_id: config?.toolCall?.id ?? '',
            }),
          ],
        },
      });
    },
  });
}
