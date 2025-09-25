/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AssistantMessage,
  BoundInferenceClient,
  Message,
  PromptOptions,
  PromptResponse,
  ToolCall,
  ToolCallOfToolDefinitions,
  ToolCallback,
  ToolCallbacksOfToolOptions,
  ToolMessage,
  ToolOptionsOfPrompt,
  UnboundPromptOptions,
} from '@kbn/inference-common';
import { MessageRole, type Prompt } from '@kbn/inference-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { last, partition, takeRightWhile } from 'lodash';
import {
  createCompleteToolCall,
  createCompleteToolCallResponse,
} from './create_complete_tool_call';
import { createReasonToolCall } from './create_reason_tool_call';

const planningTools = {
  reason: {
    description: 'reason or reflect about the task ahead or the results',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  complete: {
    description: 'complete the task based on the last output',
    schema: {
      type: 'object',
      properties: {},
    },
  },
} as const;

type PlanningTools = typeof planningTools;

type PlanningToolCallName = keyof PlanningTools;

type PlanningToolCall = ToolCallOfToolDefinitions<PlanningTools>;

function isPlanningToolName(name: string) {
  return Object.keys(planningTools).includes(name);
}

function removeReasonToolCalls(messages: Message[]) {
  return messages.filter((message) => {
    const isInternalMessage =
      (message.role === MessageRole.Tool && message.name === 'reason') ||
      (message.role === MessageRole.Assistant &&
        message.toolCalls?.some((toolCall) => toolCall.function.name === 'reason'));

    return !isInternalMessage;
  });
}

function prepareMessagesForLLM({
  stepsLeft,
  messages,
  canCallTaskTools,
  canCallPlanningTools,
}: {
  stepsLeft: number;
  messages: Message[];
  canCallTaskTools: boolean;
  canCallPlanningTools: boolean;
}) {
  const lastMessage = last(messages);

  const next =
    lastMessage?.role === MessageRole.Tool && isPlanningToolName(lastMessage.name)
      ? removeReasonToolCalls(messages.slice(0, -2)).concat(messages.slice(-2))
      : removeReasonToolCalls(messages);

  const lastToolResponse = next.findLast(
    (message): message is ToolMessage => message.role === MessageRole.Tool
  );

  return next.map((message) => {
    if (message === lastToolResponse) {
      return {
        ...lastToolResponse,
        response: {
          ...(lastToolResponse.response as Record<string, any>),
          stepsLeft,
        },
      };
    }
    return message;
  });
}

interface PromptReasoningAgentOptions {
  inferenceClient: BoundInferenceClient;
  maxSteps?: number;
  prevMessages?: undefined;
}

export function executeAsReasoningAgent<
  TPrompt extends Prompt,
  TPromptOptions extends PromptOptions<TPrompt>
>(
  options: UnboundPromptOptions &
    PromptReasoningAgentOptions & { prompt: TPrompt } & {
      toolCallbacks: ToolCallbacksOfToolOptions<ToolOptionsOfPrompt<TPrompt>>;
    }
): Promise<PromptResponse<TPromptOptions>>;

export function executeAsReasoningAgent(
  options: UnboundPromptOptions &
    PromptReasoningAgentOptions & {
      toolCallbacks: Record<string, ToolCallback>;
    }
): Promise<PromptResponse> {
  const { inferenceClient, maxSteps = 10, toolCallbacks, toolChoice } = options;

  async function callTools(toolCalls: ToolCall[]): Promise<ToolMessage[]> {
    return await Promise.all(
      toolCalls.map(async (toolCall): Promise<ToolMessage> => {
        if (isPlanningToolName(toolCall.function.name)) {
          throw new Error(`Unexpected planning tool call ${toolCall.function.name}`);
        }

        const callback = toolCallbacks[toolCall.function.name];

        const response = await withExecuteToolSpan(
          toolCall.function.name,
          {
            tool: {
              input: 'arguments' in toolCall.function ? toolCall.function.arguments : undefined,
              toolCallId: toolCall.toolCallId,
            },
          },
          () => callback(toolCall)
        );

        return {
          response: response.response,
          data: response.data,
          name: toolCall.function.name,
          toolCallId: toolCall.toolCallId,
          role: MessageRole.Tool,
        };
      })
    );
  }

  async function innerCallPromptUntil({
    messages: givenMessages,
    stepsLeft,
    temperature,
  }: {
    messages: Message[];
    stepsLeft: number;
    temperature?: number;
  }): Promise<PromptResponse> {
    const prevMessages =
      stepsLeft <= 0 ? givenMessages.concat(createCompleteToolCall()) : givenMessages;

    const withoutSystemToolCalls = removeReasonToolCalls(prevMessages);

    const consecutiveReasoningSteps = takeRightWhile(withoutSystemToolCalls, (msg) => {
      return msg.role === MessageRole.Assistant && !msg.toolCalls?.length;
    }).length;

    const lastSystemToolCall = prevMessages.findLast(
      (msg): msg is ToolMessage<PlanningToolCallName> =>
        msg.role === MessageRole.Tool && isPlanningToolName(msg.name)
    );

    const lastSystemToolCallName = lastSystemToolCall?.name;

    const isCompleting = lastSystemToolCallName === 'complete';

    const mustReason =
      !isCompleting && lastSystemToolCallName === 'reason' && consecutiveReasoningSteps === 0;

    const canCallTaskTools = !mustReason;

    const canCallPlanningTools = !mustReason && !isCompleting;

    const nextPrompt = {
      ...options.prompt,
      versions: options.prompt.versions.map((version) => {
        const { tools: promptTools, ...rest } = version;

        const mergedToolOptions = {
          tools: promptTools,
          toolChoice,
        };

        const nextTools = isCompleting
          ? mergedToolOptions
          : {
              toolChoice: undefined,
              tools: {
                ...mergedToolOptions.tools,
                ...planningTools,
              },
            };

        return {
          ...rest,
          ...nextTools,
        };
      }),
    };

    const promptOptions = {
      ...options,
      prompt: nextPrompt,
    };

    const response = await inferenceClient.prompt({
      ...promptOptions,
      stream: false,
      temperature,
      prevMessages: prepareMessagesForLLM({
        stepsLeft,
        messages: prevMessages,
        canCallTaskTools,
        canCallPlanningTools,
      }),
    });

    const assistantMessage: AssistantMessage = {
      role: MessageRole.Assistant,
      content: response.content,
      toolCalls: response.toolCalls,
    };

    const [systemToolCalls, nonSystemToolCalls] = partition(
      response.toolCalls,
      (toolCall): toolCall is PlanningToolCall => isPlanningToolName(toolCall.function.name)
    );

    if (systemToolCalls.length && response.toolCalls.length > 1) {
      throw new Error(`When using system tools, only a single tool call is allowed`);
    }

    if (isCompleting) {
      return response;
    }

    if (response.toolCalls.length === 0 || nonSystemToolCalls.length > 0) {
      const toolMessages = (await callTools(nonSystemToolCalls)).map((toolMessage) => {
        return {
          ...toolMessage,
          response: {
            ...(toolMessage.response as Record<string, any>),
            stepsLeft,
          },
        };
      });

      return innerCallPromptUntil({
        messages: prevMessages.concat(
          assistantMessage,
          ...(toolMessages.length > 0 ? [...toolMessages, ...createReasonToolCall()] : [])
        ),
        stepsLeft: stepsLeft - 1,
      });
    }

    const systemToolCall = systemToolCalls[0];

    const systemToolCallName: PlanningToolCallName = systemToolCall.function.name;

    return innerCallPromptUntil({
      stepsLeft: stepsLeft - 1,
      messages: prevMessages.concat(
        systemToolCallName === 'complete'
          ? [assistantMessage, createCompleteToolCallResponse(systemToolCall.toolCallId)]
          : createReasonToolCall()
      ),
    });
  }

  return innerCallPromptUntil({
    messages: createReasonToolCall(),
    stepsLeft: maxSteps,
  });
}
