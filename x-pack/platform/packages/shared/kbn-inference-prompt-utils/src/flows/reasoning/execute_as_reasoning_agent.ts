/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AssistantMessage,
  Message,
  PromptOptions,
  ToolCall,
  ToolCallback,
  ToolCallbackResult,
  ToolCallbacksOfToolOptions,
  ToolChoice,
  ToolMessage,
  ToolNamesOf,
  ToolOptionsOfPrompt,
  UnboundPromptOptions,
} from '@kbn/inference-common';
import { MessageRole, type Prompt } from '@kbn/inference-common';
import { withActiveInferenceSpan, withExecuteToolSpan } from '@kbn/inference-tracing';
import { trace } from '@opentelemetry/api';
import { omit, partition, takeRightWhile } from 'lodash';
import {
  createCompleteToolCall,
  createCompleteToolCallResponse,
} from './create_complete_tool_call';
import { createReasonToolCall, createReasonToolCallResponse } from './create_reason_tool_call';
import { BEGIN_INTERNAL_REASONING_MARKER, END_INTERNAL_REASONING_MARKER } from './markers';
import type { PlanningToolCall, PlanningToolCallName } from './planning_tools';
import {
  PLANNING_TOOLS,
  isPlanningToolName,
  removeReasonToolCalls,
  removeSystemToolCalls,
} from './planning_tools';
import type {
  ReasoningPromptOptions,
  ReasoningPromptResponse,
  ReasoningPromptResponseOf,
} from './types';

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
  /**
   * This removes all system tool calls except if it is the last, to compact the
   * conversation and not distract the LLM with tool calls that don't impact the
   * conversation.
   */
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
          ...(typeof lastToolResponse.response === 'string'
            ? { content: lastToolResponse.response }
            : {}),
          stepsLeft,
        },
      };
    }
    return message;
  });
}

export function executeAsReasoningAgent<
  TPrompt extends Prompt,
  TPromptOptions extends PromptOptions<TPrompt>,
  TToolCallbacks extends ToolCallbacksOfToolOptions<ToolOptionsOfPrompt<TPrompt>>,
  TFinalToolChoice extends ToolChoice<ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>> | undefined =
    | ToolChoice<ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>>
    | undefined
>(
  options: UnboundPromptOptions<TPrompt> &
    ReasoningPromptOptions & { prompt: TPrompt } & {
      toolCallbacks: TToolCallbacks;
      finalToolChoice?: TFinalToolChoice;
    }
): Promise<
  ReasoningPromptResponseOf<
    TPrompt,
    TPromptOptions & { toolChoice: TFinalToolChoice },
    TToolCallbacks
  >
>;

/**
 * Executes a prompt in a loop in a way that the LLM will use the specified tools
 * to gather context, and then produce a final output, which may or may not include
 * a final tool call.
 *
 * The rules are as follows:
 * - when `reason()` is called, the LLM SHOULD reason about the task or the tool call
 * results
 * - when `reason()` is called, the LLM CAN call another tool
 * - when `complete()` is called, and `finalToolChoice` is NOT specified, the LLM
 * MUST produce a summarization text
 * - when `complete()` is called, and `finalToolChoice` is specified, the LLM MUST
 * call a tool to complete the task, and the LLM SHOULD produce a summarization text
 * - when `finalToolChoice` is specified, and the LLM calls this tool, the task MUST
 * be completed by the orchestrator
 * - when the available number of steps have been exhausted, the LLM MUST produce
 * its final output
 * - if the LLM fails to produce its final output (e.g. by calling an unavailable tool),
 * the orchestrator MUST complete the task
 * - if `finalToolChoice` is specified and is not included as part of the definitive output,
 * the orchestrator MUST fail the task
 */
export async function executeAsReasoningAgent(
  options: UnboundPromptOptions &
    ReasoningPromptOptions & {
      toolCallbacks: Record<string, ToolCallback>;
      finalToolChoice?: ToolChoice;
    }
): Promise<ReasoningPromptResponse> {
  const { inferenceClient, maxSteps = 10, toolCallbacks } = options;

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
        ).catch((error): ToolCallbackResult => {
          trace.getActiveSpan()?.recordException(error);
          return {
            response: { error, data: undefined },
          };
        });

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
  }): Promise<ReasoningPromptResponse> {
    // Append a complete() tool call to force the LLM to generate the final response
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

    // Nudge the LLM to reason if it has not done after the last tool call
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
        };

        const nextTools = isCompleting
          ? mergedToolOptions
          : {
              tools: {
                ...mergedToolOptions.tools,
                ...PLANNING_TOOLS,
              },
            };

        return {
          ...rest,
          ...nextTools,
        };
      }),
    };

    const promptOptions = {
      ...omit(options, 'finalToolChoice'),
      prompt: nextPrompt,
    };

    const response = await inferenceClient.prompt({
      ...promptOptions,
      stream: false,
      temperature,
      toolChoice: isCompleting ? options.finalToolChoice : undefined,
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

    const finalToolCallName =
      options.finalToolChoice && typeof options.finalToolChoice === 'object'
        ? options.finalToolChoice.function
        : undefined;

    const hasCalledFinalTool = response.toolCalls.some(
      (toolCall) => toolCall.function.name === finalToolCallName
    );

    if (isCompleting || hasCalledFinalTool) {
      // We don't want to send these results back to the LLM, if we are already
      // completing
      return {
        content: response.content,
        tokens: response.tokens,
        toolCalls: response.toolCalls.filter(
          (toolCall) => toolCall.function.name === finalToolCallName
        ),
        input: removeSystemToolCalls(prevMessages),
      };
    }

    const toolMessagesForNonSystemToolCalls = nonSystemToolCalls.length
      ? (await callTools(nonSystemToolCalls)).map((toolMessage) => {
          return {
            ...toolMessage,
            response: {
              ...(typeof toolMessage.response === 'string'
                ? { content: toolMessage.response }
                : toolMessage.response),
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

  return await withActiveInferenceSpan('reason', () =>
    innerCallPromptUntil({
      // nudge the LLM to go into reasoning mode
      messages: createReasonToolCall(),
      stepsLeft: maxSteps,
    })
  );
}
