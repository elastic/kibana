/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from '@kbn/zod/v4';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { TASK_TOOL_DESCRIPTION } from '../prompts';
import { AutomaticImportAgentState } from '../state';
import type { SubAgent } from '../types';
import {
  BOILERPLATE_PROCESSOR_COUNT,
  formatCompactCustomProcessorToc,
} from '../tools/pipeline_constants';

const MAX_INJECTED_SAMPLES = 10;
const MAX_INJECTED_SUCCESSFUL_OUTPUTS = 5;
const MAX_INJECTED_FAILURE_DETAILS = 10;
const DEFAULT_ANALYZER_SAMPLE_COUNT = 5;

interface TaskToolParams {
  subagents: SubAgent[];
  model: InferenceChatModel;
  samples?: string[];
  recursionLimit?: number;
}

const injectPipelineState = (
  taskDescription: string,
  agentName: string,
  samples?: string[]
): string => {
  try {
    const currentState = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
    const hasPipeline =
      currentState.current_pipeline?.processors &&
      currentState.current_pipeline.processors.length > 0;

    if (agentName === 'log_and_ecs_analyzer' && samples && samples.length > 0) {
      const injectedSamples = samples.slice(0, DEFAULT_ANALYZER_SAMPLE_COUNT);
      const sampleLines = injectedSamples
        .map((s, i) => `### Sample ${i + 1}\n\`\`\`\n${s}\n\`\`\``)
        .join('\n\n');
      return [
        '<task>',
        taskDescription,
        '</task>',
        '',
        `<log_samples injected="${injectedSamples.length}" total_available="${samples.length}">`,
        sampleLines,
        '</log_samples>',
      ].join('\n');
    }

    if (agentName === 'ingest_pipeline_generator') {
      const isReviewIteration = Boolean(currentState.review);
      const parts: string[] = ['<task>', taskDescription, '</task>'];

      if (currentState.analysis) {
        parts.push('', '<log_format_analysis>', currentState.analysis, '</log_format_analysis>');
      }

      if (isReviewIteration && currentState.review) {
        parts.push('', '<review_feedback>', currentState.review, '</review_feedback>');
      }

      if (hasPipeline) {
        const validationResults = currentState.pipeline_validation_results;
        if (validationResults?.total_samples != null) {
          parts.push(
            '',
            '<validation_summary>',
            JSON.stringify(
              {
                success_rate: validationResults.success_rate,
                successful_samples: validationResults.successful_samples,
                failed_samples: validationResults.failed_samples,
                total_samples: validationResults.total_samples,
              },
              null,
              2
            ),
            '</validation_summary>'
          );
        }
      }

      if (hasPipeline) {
        const processors = currentState.current_pipeline.processors as Array<
          Record<string, unknown>
        >;
        if (isReviewIteration) {
          parts.push(
            '',
            '<current_pipeline format="json">',
            '<![CDATA[',
            JSON.stringify(currentState.current_pipeline, null, 2),
            ']]>',
            '</current_pipeline>',
            '',
            '<context_note>',
            'The full pipeline is above (last block). Do NOT call fetch_pipeline — use it directly for indices and processor JSON.',
            '</context_note>'
          );
        } else {
          const compactToc = formatCompactCustomProcessorToc(
            processors,
            BOILERPLATE_PROCESSOR_COUNT
          );
          parts.push(
            '',
            '<pipeline_overview mode="initial">',
            `<processor_count>${processors.length}</processor_count>`,
            '<custom_processors_compact_toc>',
            compactToc,
            '</custom_processors_compact_toc>',
            '</pipeline_overview>'
          );
        }
      }

      return parts.join('\n');
    }

    if (agentName === 'review_agent') {
      const parts: string[] = ['<task>', taskDescription, '</task>'];

      parts.push(
        '',
        '<validation_results>',
        JSON.stringify(currentState.pipeline_validation_results ?? {}, null, 2),
        '</validation_results>'
      );

      if (samples && samples.length > 0) {
        const slice = samples.slice(0, MAX_INJECTED_SAMPLES);
        parts.push(
          '',
          `<sample_logs count="${slice.length}" total_available="${samples.length}">`,
          JSON.stringify(slice, null, 2),
          '</sample_logs>'
        );
      }

      const generationResults = currentState.pipeline_generation_results;
      if (generationResults && generationResults.length > 0) {
        parts.push(
          '',
          '<successful_simulation_outputs>',
          JSON.stringify(
            {
              total_successful_count: generationResults.length,
              sample_outputs: generationResults.slice(0, MAX_INJECTED_SUCCESSFUL_OUTPUTS),
            },
            null,
            2
          ),
          '</successful_simulation_outputs>'
        );
      }

      const failureDetails = currentState.pipeline_validation_results?.failure_details;
      if (failureDetails && failureDetails.length > 0) {
        const slice = failureDetails.slice(0, MAX_INJECTED_FAILURE_DETAILS);
        parts.push(
          '',
          '<failure_details>',
          JSON.stringify(
            {
              total_failure_count: failureDetails.length,
              failures: slice,
            },
            null,
            2
          ),
          '</failure_details>'
        );
      }

      parts.push(
        '',
        '<current_pipeline format="json">',
        '<![CDATA[',
        JSON.stringify(currentState.current_pipeline ?? {}, null, 2),
        ']]>',
        '</current_pipeline>'
      );

      return parts.join('\n');
    }
  } catch {
    // State injection is best-effort; proceed without if unavailable
  }

  return taskDescription;
};

export const createTaskTool = (params: TaskToolParams) => {
  const { subagents, model, samples, recursionLimit } = params;
  const agentsMap = new Map<string, any>();
  for (const subagent of subagents) {
    const baseSubAgent = createReactAgent({
      llm: model,
      tools: subagent.tools || [],
      messageModifier: subagent.prompt,
      stateSchema: AutomaticImportAgentState,
    });
    const ReActSubAgent =
      recursionLimit != null ? baseSubAgent.withConfig({ recursionLimit }) : baseSubAgent;

    agentsMap.set(subagent.name, ReActSubAgent);
  }

  return tool(
    async (input: { description: string; subagent_name: string }, config: ToolRunnableConfig) => {
      const toolCallId = config?.toolCall?.id as string;
      const subAgent = agentsMap.get(input.subagent_name);

      const taskDescription = injectPipelineState(input.description, input.subagent_name, samples);

      let parentState: z.infer<typeof AutomaticImportAgentState> | undefined;
      try {
        parentState = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
      } catch {
        // Parent state unavailable — sub-agent starts with defaults
      }

      const modifiedState: Record<string, unknown> = {
        messages: [{ role: 'user', content: taskDescription }],
      };

      if (parentState) {
        if (parentState.current_pipeline) {
          modifiedState.current_pipeline = parentState.current_pipeline;
        }
        if (parentState.analysis) {
          modifiedState.analysis = parentState.analysis;
        }
        if (parentState.review) {
          modifiedState.review = parentState.review;
        }
        if (parentState.pipeline_generation_results) {
          modifiedState.pipeline_generation_results = parentState.pipeline_generation_results;
        }
        if (parentState.pipeline_validation_results) {
          modifiedState.pipeline_validation_results = parentState.pipeline_validation_results;
        }
        if (parentState.failure_count != null) {
          modifiedState.failure_count = parentState.failure_count;
        }
      }

      try {
        const result = await subAgent.invoke(modifiedState);

        return new Command({
          update: {
            ...result,
            messages: [
              new ToolMessage({
                content: result.messages?.slice(-1)[0]?.content,
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      } catch (e) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Error executing task with ${input.subagent_name}: ${String(e)}`,
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      }
    },
    {
      name: 'task',
      description: TASK_TOOL_DESCRIPTION.replace(
        '{available_agents}',
        subagents.map((a) => `- ${a.name}: ${a.description}`).join('\n')
      ),
      schema: z.object({
        description: z.string().describe('The task to execute with the selected agent'),
        subagent_name: z
          .string()
          .describe(
            `Name of the agent to use. Available: ${subagents.map((a) => a.name).join(', ')}`
          ),
      }),
    }
  );
};
