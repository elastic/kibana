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
import { parseSerdeChunkMessage } from './serde_utils';
import { InferenceConnectorAdapter } from '../../types';
import { handleConnectorResponse } from '../../utils';
import type { BedRockImagePart, BedRockMessage, BedRockTextPart } from './types';
import {
  BedrockChunkMember,
  serdeEventstreamIntoObservable,
} from './serde_eventstream_into_observable';
import {
  processCompletionChunks,
  processConverseCompletionChunks,
} from './process_completion_chunks';
import { addNoToolUsageDirective } from './prompts';
import { toolChoiceToBedrock, toolsToBedrock } from './convert_tools';

export const bedrockClaudeAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system = 'You are a helpful assistant.',
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
    })) as BedrockMessage[];
    // @TODO: remove
    console.log(`--@@bedrockClaudeAdapter chatComplete system`, system);
    const systemMessage = noToolUsage
      ? [{ text: addNoToolUsageDirective(system) }]
      : [{ text: system }];
    const _tools = noToolUsage ? [] : toolsToBedrock(tools, messages);
    const bedRockTools = _tools.map((toolSpec) => {
      return {
        toolSpec: {
          name: toolSpec.name,
          description: toolSpec.description,
          inputSchema: { json: toolSpec.input_schema },
        },
      };
    });

    const subActionParams = {
      system: systemMessage,
      messages: converseMessages,
      tools: bedRockTools,
      // system: noToolUsage ? addNoToolUsageDirective(system) : system,
      // messages: messagesToBedrock(messages),
      // tools: noToolUsage ? [] : toolsToBedrock(tools, messages),
      toolChoice: toolChoiceToBedrock(toolChoice),
      temperature,
      model: modelName,
      stopSequences: ['\n\nHuman:'],
      signal: abortSignal,
    };

    return defer(() => {
      return executor.invoke({
        // subAction: 'invokeStream',
        subAction: 'converseStream',
        subActionParams,
      });
    }).pipe(
      handleConnectorResponse({ processStream: serdeEventstreamIntoObservable }),
      tap((eventData) => {
        if ('modelStreamErrorException' in eventData) {
          throw createInferenceInternalError(eventData.modelStreamErrorException.originalMessage);
        }
      }),
      filter((value): value is BedrockChunkMember => {
        return value !== undefined;
        // return value.messageStart?.body !== undefined;
        // return (
        //   'messageStart' in value &&
        //   value.messageStart?.headers?.[':event-type']?.value === 'messageStart'
        // );
      }),
      map((message) => {
        const key = Object.keys(message)[0];
        return { type: key, body: JSON.parse(toUtf8(message[key].body)) };
        // return JSON.parse(toUtf8(message.messageStart?.body));
        // return parseSerdeChunkMessage(message.messageStart);
      }),
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
              type: 'image',
              source: {
                data: contentPart.source.data,
                mediaType: contentPart.source.mimeType,
                type: 'base64',
              },
            } satisfies BedRockImagePart;
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
                    type: 'tool_use' as const,
                    id: toolCall.toolCallId,
                    name: toolCall.function.name,
                    input: ('arguments' in toolCall.function
                      ? toolCall.function.arguments
                      : {}) as Record<string, unknown>,
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
              type: 'tool_result' as const,
              tool_use_id: message.toolCallId,
              content: JSON.stringify(message.response),
            },
          ],
        };
    }
  });
};
