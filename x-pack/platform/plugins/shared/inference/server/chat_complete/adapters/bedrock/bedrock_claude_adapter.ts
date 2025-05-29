/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, tap, defer } from 'rxjs';
import {
  Message,
  MessageRole,
  createInferenceInternalError,
  ToolChoiceType,
} from '@kbn/inference-common';
import { toUtf8 } from '@smithy/util-utf8';
import type {
  ConverseRequest,
  Message as BedRockConverseMessage,
  ModelStreamErrorException,
} from '@aws-sdk/client-bedrock-runtime';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { InferenceConnectorAdapter } from '../../types';
import { handleConnectorResponse } from '../../utils';
import type { BedRockMessage, BedRockTextPart } from './types';
import { serdeEventstreamIntoObservable } from './serde_eventstream_into_observable';
import {
  ConverseCompletionChunk,
  processConverseCompletionChunks,
} from './process_completion_chunks';
import { addNoToolUsageDirective } from './prompts';
import { toolChoiceToConverse, toolsToBedrock } from './convert_tools';
export const bedrockClaudeAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system = 'You are a helpful assistant for Elastic.',
    messages,
    toolChoice,
    tools,
    temperature = 0,
    modelName,
    abortSignal,
    metadata,
  }) => {
    const noToolUsage = toolChoice === ToolChoiceType.none;

    const converseMessages = messagesToBedrock(messages).map(
      (message) =>
        ({
          role: message.role,
          content: message.rawContent,
        } as BedRockConverseMessage)
    );
    const systemMessage = noToolUsage
      ? [{ text: addNoToolUsageDirective(system) }]
      : [{ text: system }];
    const _tools = noToolUsage ? [] : toolsToBedrock(tools, messages);
    const bedRockTools: NonNullable<ConverseRequest['toolConfig']>['tools'] = (_tools ?? []).map(
      (toolSpec) => {
        return {
          toolSpec: {
            name: toolSpec.name,
            description: toolSpec.description,
            inputSchema: { json: toolSpec.input_schema },
          },
        };
      }
    );

    const subActionParams = {
      system: systemMessage,
      messages: converseMessages,
      tools: bedRockTools,
      toolChoice: toolChoiceToConverse(toolChoice),
      temperature,
      model: modelName,
      stopSequences: ['\n\nHuman:'],
      signal: abortSignal,
    };

    return defer(() => {
      return executor.invoke({
        subAction: 'converseStream',
        subActionParams,
      });
    }).pipe(
      handleConnectorResponse({ processStream: serdeEventstreamIntoObservable }),
      tap((eventData) => {
        if (
          isPopulatedObject<'modelStreamErrorException', ModelStreamErrorException>(eventData, [
            'modelStreamErrorException',
          ])
        ) {
          throw createInferenceInternalError(eventData.modelStreamErrorException.originalMessage);
        }
      }),
      filter((value) => {
        return typeof value === 'object' && !!value;
      }),
      map((message) => {
        const key = Object.keys(message)[0];
        if (key && isPopulatedObject<string, { body: Uint8Array }>(message, [key])) {
          return {
            type: key,
            body: JSON.parse(toUtf8(message[key].body)),
          } as ConverseCompletionChunk;
        }
      }),
      filter((value): value is ConverseCompletionChunk => !!value),
      processConverseCompletionChunks()
    );
  },
};

const messagesToBedrock = (messages: Message[]): BedRockMessage[] => {
  return messages.map<BedRockMessage>((message) => {
    switch (message.role) {
      case MessageRole.User:
        return {
          role: 'user' as const,
          rawContent: (typeof message.content === 'string'
            ? [message.content]
            : message.content
          ).map((contentPart) => {
            if (typeof contentPart === 'string') {
              return { text: contentPart, type: 'text' } satisfies BedRockTextPart;
            } else if (contentPart.type === 'text') {
              return { text: contentPart.text, type: 'text' } satisfies BedRockTextPart;
            }
            return {
              image: {
                // Convert mimetype = 'image/png' to 'png'
                // https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ImageBlock.html
                format: contentPart.source.mimeType.split('/')[1],
                source: {
                  bytes: contentPart.source.data,
                },
              },
            };
          }),
        };
      case MessageRole.Assistant:
        return {
          role: 'assistant' as const,
          rawContent: [
            ...(message.content ? [{ type: 'text' as const, text: message.content }] : []),
            ...(message.toolCalls
              ? message.toolCalls.map((toolCall) => {
                  return {
                    toolUse: {
                      toolUseId: toolCall.toolCallId,
                      name: toolCall.function.name,
                      input: ('arguments' in toolCall.function
                        ? toolCall.function.arguments
                        : {}) as Record<string, unknown>,
                    },
                  };
                })
              : []),
          ],
        };
      case MessageRole.Tool:
        return {
          role: 'user' as const,
          rawContent: [
            {
              toolResult: {
                toolUseId: message.toolCallId,
                content: [
                  typeof message.response === 'string'
                    ? {
                        text: message.response,
                      }
                    : {
                        json: message.response,
                      },
                ],
              },
            },
          ],
        };
    }
  });
};
