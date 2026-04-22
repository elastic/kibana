/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, firstValueFrom } from 'rxjs';
import { z } from '@kbn/zod/v4';
import {
  ToolType,
  isRoundCompleteEvent,
  internalTools,
  SubagentExecutionMode,
} from '@kbn/agent-builder-common';
import type { AgentCapabilities, ChatEvent, AssistantResponse } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, SubAgentExecutor } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BackgroundExecutionService } from '../background_execution_service';

export const SubAgentToolName = internalTools.subAgentTool;

const schema = z.object({
  description: z.string().describe('A short (3-5 word) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  run_in_background: z
    .boolean()
    .optional()
    .describe(
      'Set to true to run this agent in the background. You will be notified when it completes.'
    ),
});

const toolDescription = `Start a sub-agent to perform a specific task.

The sub-agent runs with the same configuration as the current agent. Use this to delegate complex sub-tasks.

## Writing the prompt

Brief the agent like a smart colleague who just walked into the room — it hasn't seen this conversation, doesn't know what you've tried, doesn't understand why this task matters.
- Explain what you're trying to accomplish and why.
- Describe what you've already learned or ruled out.
- Give enough context about the surrounding problem that the agent can make judgment calls rather than just following a narrow instruction.
- If you need a short response, say so ("report in under 200 words").
- Lookups: hand over the exact command. Investigations: hand over the question — prescribed steps become dead weight when the premise is wrong.

## Usage notes

- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.

- The agent's outputs should generally be trusted

- If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple ${SubAgentToolName} tool use content blocks. For example, if you need to launch both a build-validator agent and a test-runner agent in parallel, send a single message with both tool calls.

- **Foreground vs background**:
  - Use foreground (default) when you need the agent's results before you can proceed — e.g., research agents whose findings inform your next steps.
  - Use background when you have genuinely independent work to do in parallel.

## Running agents in the background

- When an agent runs in the background, **you** will be **automatically** notified when it completes via a system notification
  - Do not try to proactively check on its progress. Continue with other work or respond to the user instead.
  - Assume that the execution isn't completed until you see a notification about it.
  - In particular, do **not** use the platform.core.get_workflow_execution_status tool to check the status.
  - Users will **not** be automatically notified when the execution complete. You have to inform them about it.
`;

export const createSubagentTool = ({
  agentId,
  executionId: parentExecutionId,
  connectorId,
  capabilities,
  subAgentExecutor,
  abortSignal,
  backgroundExecutionService,
}: {
  agentId: string;
  executionId: string;
  connectorId?: string;
  capabilities?: AgentCapabilities;
  subAgentExecutor: SubAgentExecutor;
  abortSignal?: AbortSignal;
  backgroundExecutionService?: BackgroundExecutionService;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SubAgentToolName,
    description: toolDescription,
    type: ToolType.builtin,
    schema,
    tags: ['subagent'],
    handler: async ({ description, prompt, run_in_background = false }, context) => {
      try {
        const fullPrompt = `${description}\n\n${prompt}`;

        const { executionId, events$ } = await subAgentExecutor.executeSubAgent({
          agentId,
          connectorId,
          capabilities,
          parentExecutionId,
          prompt: fullPrompt,
          // background agents should continue running even if main execution completes
          ...(run_in_background ? {} : { abortSignal }),
        });

        // Emit progress with execution ID so the UI can show "Watch" before results arrive
        context.events.reportProgress(`Sub-agent execution ${executionId} started`, {
          metadata: {
            agent_execution_id: executionId,
            internal: 'true',
          },
        });

        if (run_in_background) {
          backgroundExecutionService?.registerExecution(executionId);

          return {
            results: [
              createOtherResult({
                agent_execution_id: executionId,
                mode: SubagentExecutionMode.background,
                status: 'queued',
              }),
            ],
          };
        } else {
          const response = await extractFinalResponse(events$);

          return {
            results: [
              createOtherResult({
                agent_execution_id: executionId,
                mode: SubagentExecutionMode.foreground,
                status: 'completed',
                response,
              }),
            ],
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          results: [createErrorResult(`Sub-agent execution failed: ${message}`)],
        };
      }
    },
  };
};

/**
 * Subscribe to the events observable and extract the final response text
 * from the RoundComplete event.
 */
const extractFinalResponse = async (events$: Observable<ChatEvent>): Promise<AssistantResponse> => {
  const roundComplete = await firstValueFrom(events$.pipe(filter(isRoundCompleteEvent)), {
    defaultValue: undefined,
  });

  if (!roundComplete) {
    throw new Error('Sub-agent execution completed without a round complete event');
  }

  return roundComplete.data.round.response;
};
