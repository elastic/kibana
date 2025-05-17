/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { compact, last, partition, takeRightWhile } from 'lodash';
import {
  AssistantMessage,
  Message,
  MessageOf,
  MessageRole,
  ToolCall,
  ToolCallbacksOf,
  ToolCallsOf,
  ToolChoiceType,
  ToolMessage,
} from '../chat_complete';
import { BoundInferenceClient } from '../inference_client';
import { Prompt, PromptOptions, ToolOptionsOfPrompt, UnboundPromptOptions } from '../prompt';
import { generateFakeToolCallId } from './tool_calls';

const planningTools = {
  reason: {
    description: 'reason or reflect about the task ahead or the results',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  sample: {
    description: 'sample n next steps to choose a winner, defaults to 5',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
        },
      },
    },
  },
  complete: {
    description: 'complete the task based on the last output',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  fail: {
    description: 'fail the task',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  rollback: {
    description: 'roll back to an earlier version',
    schema: {
      type: 'object',
      properties: {
        rollbackReason: {
          type: 'string',
        },
      },
      required: ['rollbackReason'],
    },
  },
} as const;

type PlanningToolCallName = keyof typeof planningTools;

function createReasonToolCall(): [AssistantMessage, ToolMessage] {
  const toolCallId = generateFakeToolCallId();
  return [
    {
      role: MessageRole.Assistant,
      content: '',
      toolCalls: [
        {
          function: {
            name: 'reason',
            arguments: {},
          },
          toolCallId,
        },
      ],
    },
    {
      role: MessageRole.Tool,
      toolCallId,
      name: 'reason',
      response: {},
    },
  ];
}

type PlanningToolCall = ToolCallsOf<{ tools: typeof planningTools }>['toolCalls'][number];

export function partitionToolCalls(toolCalls: Array<ToolCall<string, Record<string, any>>>):
  | {
      systemToolCall: PlanningToolCall;
      nonSystemToolCalls?: undefined;
    }
  | {
      systemToolCall?: undefined;
      nonSystemToolCalls: Array<ToolCall<string, Record<string, any>>>;
    } {
  const [systemToolCalls, nonSystemToolCalls] = partition(
    toolCalls,
    (toolCall): toolCall is ToolCallsOf<{ tools: typeof planningTools }>['toolCalls'][number] =>
      toolCall.function.name in planningTools
  );

  if (systemToolCalls.length && toolCalls.length > 1) {
    throw new Error(`When using system tools, only a single tool call is allowed`);
  }

  const systemToolCall = systemToolCalls[0];

  if (systemToolCall) {
    return { systemToolCall };
  }

  return {
    nonSystemToolCalls,
  };
}

function isPlanningToolName(name: string) {
  return Object.keys(planningTools).includes(name) || name === 'checkpoint';
}

function removeSystemToolCalls(messages: Message[]) {
  return messages.filter((message) => {
    const isInternalMessage =
      (message.role === MessageRole.Tool && isPlanningToolName(message.name)) ||
      (message.role === MessageRole.Assistant &&
        message.toolCalls?.some((toolCall) => isPlanningToolName(toolCall.function.name)));

    return !isInternalMessage;
  });
}

function prepareMessagesForLLM({
  stepsLeft,
  toolCallsLeft,
  messages,
}: {
  stepsLeft: number;
  toolCallsLeft: number;
  messages: Message[];
}) {
  const lastMessage = last(messages);

  if (lastMessage?.role === MessageRole.Tool && isPlanningToolName(lastMessage.name)) {
    const [lastAssistantMessage, lastToolResponse] = messages.slice(-2) as [
      AssistantMessage,
      ToolMessage<PlanningToolCallName, PlanningToolCall>
    ];

    return removeSystemToolCalls(messages.slice(0, -2)).concat(lastAssistantMessage, {
      ...lastToolResponse,
      response: {
        ...lastToolResponse.response,
        stepsLeft,
        toolCallsLeft,
      },
    });
  }

  return removeSystemToolCalls(messages);
}

type CallingStrategy = 'default' | 'reason' | 'next';

interface CallPromptUntilOptions {
  inferenceClient: BoundInferenceClient;
  maxSteps?: number;
  maxToolCalls?: number;
  prevMessages?: undefined;
}

export async function callPromptUntil<
  TPrompt extends Prompt = Prompt,
  TPromptOptions extends UnboundPromptOptions<PromptOptions<TPrompt>> = UnboundPromptOptions<
    PromptOptions<TPrompt>
  >,
  TCallingStrategy extends CallingStrategy | undefined = undefined
>(
  options: TPromptOptions &
    CallPromptUntilOptions & {
      prompt: TPrompt;
      toolCallbacks: ToolCallbacksOf<ToolOptionsOfPrompt<TPrompt>>;
      strategy?: TCallingStrategy;
    }
): Promise<Array<MessageOf<ToolOptionsOfPrompt<TPrompt>>>>;

export async function callPromptUntil({
  inferenceClient,
  maxSteps = 12,
  maxToolCalls = 6,
  toolCallbacks,
  strategy,
  ...options
}: UnboundPromptOptions &
  CallPromptUntilOptions & {
    prompt: Prompt;
    toolCallbacks: ToolCallbacksOf<ToolOptionsOfPrompt<Prompt>>;
    strategy?: CallingStrategy;
  }): Promise<Message[]> {
  async function callTools(
    toolCalls: Array<ToolCall<string, Record<string, any>>>
  ): Promise<ToolMessage[]> {
    return await Promise.all(
      toolCalls.map(async (toolCall): Promise<ToolMessage> => {
        if (toolCall.function.name in planningTools) {
          throw new Error(`Unexpected planning tool call ${toolCall.function.name}`);
        }

        const callback = toolCallbacks[toolCall.function.name];

        const response = await withExecuteToolSpan(
          {
            name: toolCall.function.name,
            input: toolCall.function.arguments,
            toolCallId: toolCall.toolCallId,
          },
          () => callback(toolCall)
        );
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
    messages: prevMessages,
    toolCallsLeft,
    stepsLeft,
  }: {
    messages: Message[];
    toolCallsLeft: number;
    stepsLeft: number;
  }): Promise<Message[]> {
    const withoutSystemToolCalls = removeSystemToolCalls(prevMessages);

    const outOfBudget = stepsLeft <= 0 || toolCallsLeft <= 0;

    const consecutiveReasoningSteps = takeRightWhile(withoutSystemToolCalls, (msg) => {
      return msg.role === MessageRole.Assistant && !msg.toolCalls?.length;
    }).length;

    const lastSystemToolCall = prevMessages.findLast(
      (msg): msg is ToolMessage<PlanningToolCallName, PlanningToolCall> =>
        msg.role === MessageRole.Tool && isPlanningToolName(msg.name)
    );

    const lastSystemToolCallName = lastSystemToolCall?.name;

    const shouldExit = outOfBudget || (strategy === 'reason' && consecutiveReasoningSteps >= 2);

    if (shouldExit) {
      return prevMessages;
    }

    const requireResolution = stepsLeft <= 1 || toolCallsLeft <= 0;

    const canCallAnyTool =
      strategy === 'default' ||
      (strategy === 'reason' && consecutiveReasoningSteps > 0) ||
      (strategy === 'next' &&
        lastSystemToolCallName !== 'complete' &&
        lastSystemToolCallName !== 'fail');

    const shouldExitAfterResponse =
      lastSystemToolCallName === 'complete' || lastSystemToolCallName === 'fail';

    const canCallPlanningTool = !shouldExitAfterResponse;

    const nextPrompt = {
      ...options.prompt,
      versions: options.prompt.versions.map((version) => {
        const { tools, toolChoice, ...rest } = version;

        const nextPlanningTools = requireResolution
          ? {
              complete: planningTools.complete,
              fail: planningTools.fail,
            }
          : planningTools;

        const nextTools = {
          tools: {
            ...tools,
            ...(canCallPlanningTool ? nextPlanningTools : {}),
          },
          toolChoice: requireResolution
            ? ToolChoiceType.required
            : canCallAnyTool
            ? undefined
            : ToolChoiceType.none,
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

    const response = await inferenceClient.prompt<Prompt>({
      ...promptOptions,
      prevMessages: prepareMessagesForLLM({
        stepsLeft,
        toolCallsLeft,
        messages: prevMessages,
      }),
    });

    const assistantMessage: AssistantMessage = {
      role: MessageRole.Assistant,
      content: response.content,
      toolCalls: response.toolCalls,
    };

    const [systemToolCalls, nonSystemToolCalls] = partition(
      response.toolCalls,
      (toolCall): toolCall is ToolCallsOf<{ tools: typeof planningTools }>['toolCalls'][number] =>
        toolCall.function.name in planningTools
    );

    if (systemToolCalls.length && response.toolCalls.length > 1) {
      throw new Error(`When using system tools, only a single tool call is allowed`);
    }

    if (shouldExitAfterResponse) {
      return prevMessages.concat(assistantMessage);
    }

    if (response.toolCalls.length === 0 || nonSystemToolCalls.length > 0) {
      return innerCallPromptUntil({
        messages: prevMessages.concat(
          assistantMessage,
          ...(await callTools(nonSystemToolCalls)).map((toolMessage) => {
            return {
              ...toolMessage,
              response: {
                stepsLeft,
                toolCallsLeft,
                ...(toolMessage.response as Record<string, any>),
              },
            };
          })
        ),
        stepsLeft: stepsLeft - 1,
        toolCallsLeft: nonSystemToolCalls.length > 0 ? toolCallsLeft - 1 : toolCallsLeft,
      });
    }

    const systemToolCall = systemToolCalls[0];

    const systemToolCallName: PlanningToolCallName = systemToolCall.function.name;

    if (systemToolCall.function.name === 'sample') {
      const messagesWithSampleMessages: Message[] = [
        ...prevMessages,
        assistantMessage,
        {
          role: MessageRole.Tool,
          response: {},
          name: systemToolCall.function.name,
          toolCallId: systemToolCall.toolCallId,
        },
      ];

      const samples = await Promise.all(
        new Array(systemToolCall.function.arguments.count).fill(undefined).map(async () => {
          return await inferenceClient.prompt<Prompt>({
            ...promptOptions,
            prevMessages: prepareMessagesForLLM({
              stepsLeft,
              toolCallsLeft,
              messages: messagesWithSampleMessages,
            }),
          });
        })
      );

      const samplesWithToolResponses = await Promise.all(
        samples.map(async (sample) => {
          if (!sample.toolCalls.length) {
            return {
              sample,
            };
          }

          const toolCalls = partitionToolCalls(sample.toolCalls);

          if (toolCalls.systemToolCall || !!toolCalls.nonSystemToolCalls.length) {
            return {
              sample,
            };
          }

          return {
            sample,
            responses: await callTools(toolCalls.nonSystemToolCalls ?? []),
          };
        })
      );

      const {
        toolCalls: [
          {
            function: {
              arguments: { winner },
            },
          },
        ],
      } = await inferenceClient.prompt({
        ...promptOptions,
        prevMessages: prepareMessagesForLLM({
          stepsLeft,
          toolCallsLeft,
          messages: [
            ...prevMessages,
            assistantMessage,
            {
              role: MessageRole.Tool,
              response: {
                samples: samplesWithToolResponses.map(({ sample, responses }, idx) => {
                  return {
                    id: idx,
                    sample,
                    responses,
                  };
                }),
              },
              name: systemToolCall.function.name,
              toolCallId: systemToolCall.toolCallId,
            },
          ],
        }),
        prompt: {
          ...promptOptions.prompt,
          versions: promptOptions.prompt.versions.map((version) => {
            return {
              ...version,
              toolChoice: ToolChoiceType.required,
              tools: {
                pick_winner: {
                  description: 'Pick a winner based on the sampled responses',
                  schema: {
                    type: 'object',
                    properties: {
                      winner: {
                        type: 'number',
                      },
                    },
                    required: ['winner'],
                  },
                },
              } as const,
            };
          }),
        },
      });

      const winningResponse = samplesWithToolResponses[winner];

      return innerCallPromptUntil({
        stepsLeft,
        toolCallsLeft,
        messages: [
          ...messagesWithSampleMessages,
          {
            role: MessageRole.Assistant,
            content: winningResponse.sample.content,
            toolCalls: winningResponse.sample.toolCalls,
          },
          ...(winningResponse.responses ?? []),
        ],
      });
    }

    if (systemToolCall.function.name === 'rollback') {
      const lastTaskTool = prevMessages.findLast(
        (msg): msg is ToolMessage => msg.role === MessageRole.Tool && !isPlanningToolName(msg.name)
      );

      if (!lastTaskTool) {
        throw new Error(`Cannot find a task tool message to roll back`);
      }

      const messagesUntilLastTaskTool = prevMessages.slice(
        0,
        prevMessages.indexOf(lastTaskTool) - 2
      );

      return innerCallPromptUntil({
        stepsLeft: stepsLeft - 1,
        toolCallsLeft,
        messages: messagesUntilLastTaskTool.concat(
          assistantMessage,
          {
            role: MessageRole.Tool,
            response: {},
            name: 'rollback',
            toolCallId: systemToolCall.toolCallId,
          },
          {
            role: MessageRole.Assistant,
            content: systemToolCall.function.arguments.rollbackReason,
          }
        ),
      });
    }

    if (
      systemToolCallName === 'complete' ||
      systemToolCallName === 'fail' ||
      systemToolCallName === 'reason'
    ) {
      return innerCallPromptUntil({
        stepsLeft: stepsLeft - 1,
        toolCallsLeft,
        messages: prevMessages.concat(assistantMessage, {
          role: MessageRole.Tool,
          name: systemToolCallName,
          toolCallId: systemToolCall.toolCallId,
          response: {},
        }),
      });
    }

    throw new Error('We should not end up here');
  }

  return innerCallPromptUntil({
    messages: strategy !== 'default' ? [...createReasonToolCall()] : [],
    stepsLeft: maxSteps,
    toolCallsLeft: maxToolCalls,
  }).then((messages) => {
    return compact(
      messages.map((message) => {
        if ('toolCalls' in message && message.toolCalls?.length) {
          return {
            ...message,
            toolCalls: message.toolCalls.filter(
              (toolCall) => !isPlanningToolName(toolCall.function.name)
            ),
          };
        }
        if (message.role === MessageRole.Tool && isPlanningToolName(message.name)) {
          return undefined;
        }
        return message;
      })
    );
  });
}
