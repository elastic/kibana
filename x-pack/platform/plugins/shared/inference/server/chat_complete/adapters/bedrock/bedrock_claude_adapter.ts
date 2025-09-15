/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, tap, defer } from 'rxjs';
import type { Message } from '@kbn/inference-common';
import { MessageRole, createInferenceInternalError, ToolChoiceType } from '@kbn/inference-common';
import { toUtf8 } from '@smithy/util-utf8';
import type {
  ModelStreamErrorException,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isPlainObject } from 'lodash';
import type { Readable } from 'stream';
import type { InferenceConnectorAdapter } from '../../types';
import { handleConnectorResponse } from '../../utils';
import type { BedRockImagePart, BedRockMessage, BedRockToolUsePart } from './types';
import { serdeEventstreamIntoObservable } from './serde_eventstream_into_observable';
import type { ConverseCompletionChunk } from './process_completion_chunks';
import { processConverseCompletionChunks } from './process_completion_chunks';
import { addNoToolUsageDirective } from './prompts';
import { toolChoiceToConverse, toolsToConverseBedrock } from './convert_tools';

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

    const converseMessages = messagesToBedrock(messages).map((message) => ({
      role: message.role,
      content: message.rawContent,
    }));
    const systemMessage = noToolUsage
      ? [{ text: addNoToolUsageDirective(system) }]
      : [{ text: system }];
    const bedRockTools = noToolUsage ? [] : toolsToConverseBedrock(tools, messages);

    const subActionParams = {
      system: systemMessage,
      messages: converseMessages,
      tools: bedRockTools?.length ? bedRockTools : undefined,
      toolChoice: toolChoiceToConverse(toolChoice),
      temperature,
      model: modelName,
      stopSequences: ['\n\nHuman:'],
      signal: abortSignal,
    };

    return defer(async () => {
      const res = await executor.invoke({
        subAction: 'converseStream',
        subActionParams,
      });
      const result = res.data as { stream: Readable };
      return { ...res, data: result?.stream };
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
  return messages.map((message): BedRockMessage => {
    switch (message.role) {
      case MessageRole.User: {
        const rawContent: BedRockMessage['rawContent'] = [];
        const contentArr =
          typeof message.content === 'string' ? [message.content] : message.content;
        for (const contentPart of contentArr) {
          if (typeof contentPart === 'string') {
            rawContent.push({ text: contentPart });
          } else if (contentPart.type === 'text') {
            rawContent.push({ text: contentPart.text });
          } else if (contentPart.source?.data && contentPart.source?.mimeType) {
            const format = contentPart.source.mimeType.split(
              '/'
            )[1] as BedRockImagePart['image']['format'];
            rawContent.push({
              image: {
                format,
                source: {
                  bytes: new TextEncoder().encode(contentPart.source.data),
                },
              },
            });
          }
        }
        return {
          role: 'user',
          rawContent,
        };
      }
      case MessageRole.Assistant: {
        const rawContent: BedRockMessage['rawContent'] = [];
        if (message.content) {
          rawContent.push({ text: message.content });
        }
        if (message.toolCalls) {
          for (const toolCall of message.toolCalls) {
            rawContent.push({
              toolUse: {
                toolUseId: toolCall.toolCallId,
                name: toolCall.function.name,
                input: ('arguments' in toolCall.function
                  ? toolCall.function.arguments
                  : {}) as BedRockToolUsePart['toolUse']['input'],
              },
            });
          }
        }
        return {
          role: 'assistant',
          rawContent,
        };
      }
      case MessageRole.Tool: {
        const contentArr: ToolResultContentBlock[] = [];
        if (typeof message.response === 'string') {
          contentArr.push({ text: message.response });
        } else {
          // It currently accepts only objects, see - https://github.com/aws/aws-sdk-js-v3/issues/7330
          if (isPlainObject(message.response)) {
            contentArr.push({
              json: message.response as ToolResultContentBlock.JsonMember['json'],
            });
          } else {
            throw createInferenceInternalError(
              `Unsupported tool response type for toolCallId "${message.toolCallId}"; expected string or plain object`
            );
          }
        }

        return {
          role: 'user',
          rawContent: [
            {
              toolResult: {
                toolUseId: message.toolCallId,
                content: contentArr,
              },
            },
          ],
        };
      }
    }
  });
};
