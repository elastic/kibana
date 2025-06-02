/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { last, merge, omit, partition, takeRightWhile } from 'lodash';
import { inspect } from 'util';
import {
  AssistantMessage,
  AssistantMessageOf,
  Message,
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

const SAMPLES_COUNT = 3;

const REASON_INSTRUCTIONS = `Enter into your internal reasoning mode. You're not allowed to call any tools in this turn - hand control back to the orchestrator.`;

const planningToolsWithoutRequiredStateId = {
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
  fail: {
    description: 'fail the task',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  undo: {
    description: 'Remove all steps since the last task tool call',
    schema: {
      type: 'object',
      properties: {
        stateId: {
          type: 'string',
          description: 'The state ID you want to undo to',
        },
      },
      required: ['stateId'],
    },
  },
} as const;

const planningToolsWithRequiredStateId = merge({}, planningToolsWithoutRequiredStateId, {
  complete: {
    schema: {
      properties: {
        bestCandidateStateId: {
          type: 'string',
          description: 'The state you select as the winner',
        },
      },
      required: ['bestCandidateStateId'],
    },
  },
} as const);

type PlanningTools =
  | typeof planningToolsWithoutRequiredStateId
  | typeof planningToolsWithRequiredStateId;

type PlanningToolCallName = keyof PlanningTools;

type PlanningToolCall = ToolCallsOf<{ tools: PlanningTools }>['toolCalls'][number];

function createReasonToolCall(stateId?: string): [AssistantMessage, ToolMessage] {
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
      response: {
        acknowledged: true,
        instructions: `${REASON_INSTRUCTIONS}${
          stateId ? ` Reflect on the state in ${stateId}` : ''
        }`,
      },
    },
  ];
}

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
    (toolCall): toolCall is PlanningToolCall => isPlanningToolName(toolCall.function.name)
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
  return Object.keys(planningToolsWithoutRequiredStateId).includes(name);
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

  const next =
    lastMessage?.role === MessageRole.Tool && isPlanningToolName(lastMessage.name)
      ? removeSystemToolCalls(messages.slice(0, -2)).concat(messages.slice(-2))
      : removeSystemToolCalls(messages);

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
          toolCallsLeft,
        },
      };
    }
    return message;
  });
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
      logger: Logger;
    }
): Promise<AssistantMessageOf<ToolOptionsOfPrompt<TPrompt>>>;

export async function callPromptUntil({
  inferenceClient,
  maxSteps = 12,
  maxToolCalls = 6,
  toolCallbacks,
  strategy,
  tools,
  toolChoice,
  logger,
  ...options
}: UnboundPromptOptions &
  CallPromptUntilOptions & {
    prompt: Prompt;
    toolCallbacks: ToolCallbacksOf<ToolOptionsOfPrompt<Prompt>>;
    strategy?: CallingStrategy;
    logger: Logger;
  }): Promise<AssistantMessage> {
  async function callTools(
    toolCalls: Array<ToolCall<string, Record<string, any>>>
  ): Promise<ToolMessage[]> {
    return await Promise.all(
      toolCalls.map(async (toolCall): Promise<ToolMessage> => {
        if (isPlanningToolName(toolCall.function.name)) {
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
          response: {
            ...(response as Record<string, any>),
            stateId: toolCall.toolCallId,
          },
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
    temperature,
  }: {
    messages: Message[];
    toolCallsLeft: number;
    stepsLeft: number;
    temperature?: number;
  }): Promise<Message[]> {
    const withoutSystemToolCalls = removeSystemToolCalls(prevMessages);

    const outOfBudget = stepsLeft <= 0 || toolCallsLeft < 0;

    const consecutiveReasoningSteps = takeRightWhile(withoutSystemToolCalls, (msg) => {
      return msg.role === MessageRole.Assistant && !msg.toolCalls?.length;
    }).length;

    const lastSystemToolCall = prevMessages.findLast(
      (msg): msg is ToolMessage<PlanningToolCallName, PlanningToolCall> =>
        msg.role === MessageRole.Tool && isPlanningToolName(msg.name)
    );

    const lastSystemToolCallName = lastSystemToolCall?.name;

    const shouldExit = outOfBudget || (strategy === 'reason' && consecutiveReasoningSteps >= 2);

    const isCompleting = lastSystemToolCallName === 'complete';

    const isFailing = lastSystemToolCallName === 'fail';

    const isFinalizing = isCompleting || isFailing;

    if (shouldExit) {
      return prevMessages;
    }

    const nextPrompt = {
      ...options.prompt,
      versions: options.prompt.versions.map((version) => {
        const { tools: promptTools, toolChoice: promptToolChoice, ...rest } = version;

        const promptRequiresToolCallToComplete =
          version.toolChoice &&
          version.toolChoice !== ToolChoiceType.none &&
          version.toolChoice !== ToolChoiceType.auto;

        const requireResolution =
          strategy === 'next' &&
          !isFinalizing &&
          (stepsLeft <= 2 || toolCallsLeft <= (promptRequiresToolCallToComplete ? 1 : 0));

        const willReason =
          !isFinalizing &&
          !requireResolution &&
          lastSystemToolCallName === 'reason' &&
          consecutiveReasoningSteps === 0;

        const canCallTaskTools =
          strategy === 'default' ||
          (strategy === 'reason' && consecutiveReasoningSteps > 0) ||
          (strategy === 'next' && !isFailing && !requireResolution);

        const canCallAllPlanningTools = strategy === 'next' && !isFinalizing && !requireResolution;

        const canCallOnlyFinalizingTools = strategy === 'next' && requireResolution;

        const planningTools = promptRequiresToolCallToComplete
          ? planningToolsWithRequiredStateId
          : planningToolsWithoutRequiredStateId;

        const nextPlanningTools: Partial<PlanningTools> = canCallOnlyFinalizingTools
          ? { complete: planningTools.complete, fail: planningTools.fail }
          : canCallAllPlanningTools
          ? planningTools
          : {};

        const taskToolChoice = toolChoice || promptToolChoice;

        const nextTaskTools = canCallTaskTools
          ? {
              ...tools,
              ...promptTools,
            }
          : {};

        const nextToolChoice =
          isFinalizing || (!canCallAllPlanningTools && !canCallTaskTools)
            ? ToolChoiceType.none
            : requireResolution
            ? ToolChoiceType.required
            : strategy === 'default'
            ? taskToolChoice
            : undefined;

        const nextTools = {
          tools: {
            ...nextTaskTools,
            ...nextPlanningTools,
          },
          toolChoice: nextToolChoice,
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
      temperature,
      prevMessages: prepareMessagesForLLM({
        stepsLeft,
        toolCallsLeft,
        messages: prevMessages,
      }),
    });

    if (lastSystemToolCallName === 'fail') {
      throw new Error(`Failed to complete task: ${response.content}`);
    }

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

    if (isFinalizing) {
      return prevMessages.concat(assistantMessage);
    }

    if (response.toolCalls.length === 0 || nonSystemToolCalls.length > 0) {
      const toolMessages = (await callTools(nonSystemToolCalls)).map((toolMessage) => {
        return {
          ...toolMessage,
          response: {
            ...(toolMessage.response as Record<string, any>),
            stepsLeft,
            toolCallsLeft,
          },
        };
      });
      return innerCallPromptUntil({
        messages: prevMessages.concat(
          assistantMessage,
          ...(toolMessages.length > 0
            ? [...toolMessages, ...createReasonToolCall(toolMessages[0].toolCallId)]
            : [])
        ),
        stepsLeft: stepsLeft - 1,
        toolCallsLeft: nonSystemToolCalls.length > 0 ? toolCallsLeft - 1 : toolCallsLeft,
      });
    }

    const systemToolCall = systemToolCalls[0];

    const systemToolCallName: PlanningToolCallName = systemToolCall.function.name;

    if (systemToolCall.function.name === 'undo') {
      const lastNonSystemToolCall = prevMessages.findLast((msg): msg is AssistantMessage => {
        return (
          msg.role === MessageRole.Assistant &&
          !!msg.toolCalls?.some((toolCall) => !isPlanningToolName(toolCall.function.name))
        );
      });

      if (!lastNonSystemToolCall) {
        throw new Error(
          `Could not find something to undo, need at least a reasoning step or a non-system tool call`
        );
      }

      let rollbackIndex = prevMessages.indexOf(lastNonSystemToolCall);

      if (!lastNonSystemToolCall.content) {
        const messageBefore = prevMessages[rollbackIndex - 1];
        if (
          messageBefore?.role === MessageRole.Assistant &&
          messageBefore?.content &&
          !messageBefore?.toolCalls?.length
        ) {
          rollbackIndex--;
        }
      }

      const messagesAfterRollback = prevMessages.slice(0, rollbackIndex);

      const samples = await Promise.all(
        new Array(SAMPLES_COUNT).fill(undefined).map(async () => {
          return await inferenceClient.prompt<Prompt>({
            ...promptOptions,
            temperature: 0.8,
            prevMessages: prepareMessagesForLLM({
              stepsLeft,
              toolCallsLeft,
              messages: messagesAfterRollback,
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

          if (toolCalls.systemToolCall || !toolCalls.nonSystemToolCalls.length) {
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

      const fakeToolCallId = generateFakeToolCallId();

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
            ...messagesAfterRollback,
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [
                {
                  function: {
                    name: 'sample',
                    arguments: {},
                  },
                  toolCallId: fakeToolCallId,
                },
              ],
            },
            {
              role: MessageRole.Tool,
              response: {
                samples: samplesWithToolResponses.map(({ sample, responses }, idx) => {
                  return {
                    id: idx,
                    sample: {
                      content: sample.content,
                      toolCalls: sample.toolCalls,
                    },
                    responses,
                  };
                }),
              },
              name: 'sample',
              toolCallId: fakeToolCallId,
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
        stepsLeft: stepsLeft - 1,
        toolCallsLeft,
        messages: [
          ...messagesAfterRollback,
          {
            role: MessageRole.Assistant,
            content: winningResponse.sample.content,
            toolCalls: winningResponse.sample.toolCalls,
          },
          ...(winningResponse.responses
            ? [
                ...winningResponse.responses,
                ...createReasonToolCall(winningResponse.responses[0].toolCallId),
              ]
            : []),
        ],
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
          response: {
            acknowledged: true,
            instruction:
              systemToolCallName === 'reason'
                ? REASON_INSTRUCTIONS
                : systemToolCallName === 'complete'
                ? `Complete the task, according to the instructions`
                : `Explain why the task failed, according to the instructions`,
          },
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
    const lastAssistantMessageWithSystemToolCall = messages.findLast(
      (msg): msg is AssistantMessageOf<{ tools: PlanningTools }> =>
        msg.role === MessageRole.Assistant &&
        !!msg.toolCalls?.some((toolCall) => isPlanningToolName(toolCall.function.name))
    );

    const lastSystemToolCall = last(lastAssistantMessageWithSystemToolCall?.toolCalls);

    const lastAssistantMessage = messages.findLast((msg): msg is AssistantMessage => {
      return msg.role === MessageRole.Assistant && !!msg.content;
    });

    if (lastAssistantMessage && lastSystemToolCall?.function.name === 'complete') {
      const stateId = lastSystemToolCall.function.arguments.bestCandidateStateId;
      const winningToolCall = stateId
        ? last(
            messages.flatMap((msg) =>
              msg.role === MessageRole.Assistant
                ? msg.toolCalls?.filter((toolCall) => toolCall.toolCallId === stateId) ?? []
                : []
            )
          )
        : undefined;

      return {
        role: MessageRole.Assistant,
        content: lastAssistantMessage.content,
        ...(winningToolCall ? { toolCalls: [winningToolCall] } : {}),
      };
    } else if (lastAssistantMessage && lastSystemToolCall?.function.name === 'fail') {
      return omit(lastAssistantMessage, 'toolCalls');
    }

    logger.error(`Failed to finalize process: ${inspect(messages, { depth: 6 })}`);
    throw new Error(`Process was not finalized`);
  });
}
