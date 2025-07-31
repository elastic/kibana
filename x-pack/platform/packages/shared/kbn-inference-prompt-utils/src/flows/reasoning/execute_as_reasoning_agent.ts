/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AssistantMessage,
  ToolMessage,
  ToolCall,
  Message,
  BoundInferenceClient,
  PromptOptions,
  ToolCallbacksOf,
  ToolOptionsOfPrompt,
  ToolCallback,
  PromptResponse,
  UnboundPromptOptions,
  MessageOf,
} from '@kbn/inference-common';
import { MessageRole, type Prompt, type ToolCallsOf } from '@kbn/inference-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { trace } from '@opentelemetry/api';
import { partition, takeRightWhile } from 'lodash';
import { createReasonToolCall, createReasonToolCallResponse } from './create_reason_tool_call';
import {
  createCompleteToolCall,
  createCompleteToolCallResponse,
} from './create_complete_tool_call';
import { BEGIN_INTERNAL_REASONING_MARKER, END_INTERNAL_REASONING_MARKER } from './markers';

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

type PlanningToolCall = ToolCallsOf<{ tools: PlanningTools }>['toolCalls'][number];

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
  const lastToolMessage = messages.findLast(
    (message): message is ToolMessage => message.role === MessageRole.Tool
  );

  let next = messages;

  if (lastToolMessage && isPlanningToolName(lastToolMessage.name)) {
    const idx = messages.indexOf(lastToolMessage) - 1;
    next = removeReasonToolCalls(messages.slice(0, idx)).concat(messages.slice(idx));
  } else {
    next = removeReasonToolCalls(messages);
  }

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

interface ReasoningPromptOptions {
  inferenceClient: BoundInferenceClient;
  maxSteps?: number;
  prevMessages?: undefined;
}

export type ReasoningPromptResponseOf<
  TPrompt extends Prompt = Prompt,
  TPromptOptions extends PromptOptions<TPrompt> = PromptOptions<TPrompt>,
  TToolCallbacks extends ToolCallbacksOf<ToolOptionsOfPrompt<TPrompt>> = ToolCallbacksOf<
    ToolOptionsOfPrompt<TPrompt>
  >
> = PromptResponse<TPromptOptions> & {
  input: Array<
    MessageOf<
      ToolOptionsOfPrompt<TPrompt>,
      {
        [key in keyof TToolCallbacks]: Awaited<ReturnType<TToolCallbacks[key]>>;
      }
    >
  >;
};

export type ReasoningPromptResponse = PromptResponse & { input: Message[] };

export function executeAsReasoningAgent<
  TPrompt extends Prompt,
  TPromptOptions extends PromptOptions<TPrompt>,
  TToolCallbacks extends ToolCallbacksOf<ToolOptionsOfPrompt<TPrompt>>
>(
  options: UnboundPromptOptions &
    ReasoningPromptOptions & { prompt: TPrompt } & {
      toolCallbacks: TToolCallbacks;
    }
): Promise<ReasoningPromptResponseOf<TPrompt, TPromptOptions, TToolCallbacks>>;

export async function executeAsReasoningAgent(
  options: UnboundPromptOptions &
    ReasoningPromptOptions & {
      toolCallbacks: Record<string, ToolCallback>;
    }
): Promise<ReasoningPromptResponse> {
  const { inferenceClient, maxSteps = 10, toolCallbacks, tools, toolChoice } = options;

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
        ).catch((error) => {
          trace.getActiveSpan()?.recordException(error);
          return { error };
        });

        return {
          response,
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
  }): Promise<ReasoningPromptResponse> {
    const prevMessages =
      stepsLeft <= 0 ? givenMessages.concat(createCompleteToolCall()) : givenMessages;

    const withoutSystemToolCalls = removeReasonToolCalls(prevMessages);

    const consecutiveReasoningSteps = takeRightWhile(withoutSystemToolCalls, (msg) => {
      return msg.role === MessageRole.Assistant && !msg.toolCalls?.length;
    }).length;

    const lastSystemToolCall = prevMessages.findLast(
      (msg): msg is ToolMessage<PlanningToolCallName, PlanningToolCall> =>
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
        const { tools: promptTools, toolChoice: promptToolChoice, ...rest } = version;

        const mergedToolOptions = {
          tools: {
            ...promptTools,
            ...tools,
          },
          toolChoice: toolChoice || promptToolChoice,
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
      stopSequences: [END_INTERNAL_REASONING_MARKER],
    });

    let content = response.content;

    /**
     * If the LLM hasn't used these markers, we assume it wants to complete its
     * output.
     */

    let completeNextTurn =
      content &&
      !content.includes(BEGIN_INTERNAL_REASONING_MARKER) &&
      !content.includes(END_INTERNAL_REASONING_MARKER) &&
      !response.toolCalls.length;

    /**
     * Remove content after <<<END_INTERNAL>>>. This means that the LLM has combined final output
     * with internal reasoning, and it usually leads the LLM into a loop where it repeats itself.
     */

    const [internalContent, ...externalContentParts] = content.split(END_INTERNAL_REASONING_MARKER);

    const externalContent = externalContentParts.join(END_INTERNAL_REASONING_MARKER).trim();

    // use some kind of buffer to allow small artifacts around the markers, like markdown.
    if (externalContent.length && externalContent.length > 25) {
      content = internalContent + END_INTERNAL_REASONING_MARKER;
      completeNextTurn = true;
    }

    const assistantMessage: AssistantMessage = {
      role: MessageRole.Assistant,
      content,
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
      // We don't want to send these results back to the LLM, if we are already
      // completing
      return {
        content: response.content,
        tokens: response.tokens,
        toolCalls: response.toolCalls as [],
        input: withoutSystemToolCalls,
      };
    }

    const toolMessagesForNonSystemToolCalls = nonSystemToolCalls.length
      ? (await callTools(nonSystemToolCalls)).map((toolMessage) => {
          return {
            ...toolMessage,
            response: {
              ...(toolMessage.response as Record<string, any>),
              stepsLeft,
            },
          };
        })
      : [];

    const systemToolMessages = systemToolCalls.map((systemToolCall) => {
      if (systemToolCall.function.name === 'reason') {
        return createReasonToolCallResponse(systemToolCall.toolCallId);
      }
      return createCompleteToolCallResponse(systemToolCall.toolCallId);
    });

    const allToolMessages = [...toolMessagesForNonSystemToolCalls, ...systemToolMessages];

    if (completeNextTurn) {
      return innerCallPromptUntil({
        messages: prevMessages.concat(assistantMessage, ...allToolMessages),
        stepsLeft: 0,
      });
    }

    return innerCallPromptUntil({
      messages: prevMessages.concat(
        assistantMessage,
        ...allToolMessages,
        ...(nonSystemToolCalls.length ? createReasonToolCall() : [])
      ),
      stepsLeft: stepsLeft - 1,
    });
  }

  return await innerCallPromptUntil({
    messages: createReasonToolCall(),
    stepsLeft: maxSteps,
  });
}
