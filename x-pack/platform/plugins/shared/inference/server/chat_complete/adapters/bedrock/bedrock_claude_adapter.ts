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
import {
  type Message as BedrockMessage,
  type MessageRole as BedRockMessageRole,
  ConverseCommand,
  SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { parseSerdeChunkMessage } from './serde_utils';
import { InferenceConnectorAdapter } from '../../types';
import { handleConnectorResponse } from '../../utils';
import type { BedRockImagePart, BedRockMessage, BedRockTextPart } from './types';
import {
  BedrockChunkMember,
  serdeEventstreamIntoObservable,
} from './serde_eventstream_into_observable';
import { processCompletionChunks } from './process_completion_chunks';
import { addNoToolUsageDirective } from './prompts';
import { toolChoiceToBedrock, toolsToBedrock } from './convert_tools';

export const bedrockClaudeAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    temperature = 0,
    modelName,
    modelId,
    abortSignal,
    metadata,
  }) => {
    const model = modelName ?? modelId;
    console.log(`--@@chatComplete modelId`, model);
    // const model = modelName ??
    const noToolUsage = toolChoice === ToolChoiceType.none;

    const converseMessages = messagesToBedrock(messages).map((message) => ({
      role: message.role,
      content: message.rawContent,
    })) as BedrockMessage[];
    const systemMessage = noToolUsage
      ? [{ text: addNoToolUsageDirective(system) }]
      : [{ text: system }];
    const command = new ConverseCommand({
      modelId: model ?? 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      // system: noToolUsage ? addNoToolUsageDirective(system) : system,
      messages: converseMessages,
      system: systemMessage as SystemContentBlock[],
    });
    // @TODO: remove
    console.log(`--@@command`, command);
    console.log(`--@@command.input.system`, command.input.system);

    console.log(`--@@command.input.messages`, JSON.stringify(command.input.messages, null, 2));

    // const subActionParams = {
    //   system: noToolUsage ? addNoToolUsageDirective(system) : system,
    //   messages: messagesToBedrock(messages),
    //   tools: noToolUsage ? [] : toolsToBedrock(tools, messages),
    //   toolChoice: toolChoiceToBedrock(toolChoice),
    //   temperature,
    //   model: modelName,
    //   stopSequences: ['\n\nHuman:'],
    //   signal: abortSignal,
    //   ...(metadata?.connectorTelemetry ? { telemetryMetadata: metadata.connectorTelemetry } : {}),
    // };

    const converseSubActionParams = {
      command,
      signal: abortSignal,
      ...(metadata?.connectorTelemetry ? { telemetryMetadata: metadata.connectorTelemetry } : {}),
    };
    return defer(() => {
      return executor.invoke({
        subAction: 'bedrockClientSend',
        subActionParams: converseSubActionParams,
      });
    }).pipe(
      handleConnectorResponse({ processStream: serdeEventstreamIntoObservable }),
      tap((eventData) => {
        if ('modelStreamErrorException' in eventData) {
          throw createInferenceInternalError(eventData.modelStreamErrorException.originalMessage);
        }
      }),
      filter((value): value is BedrockChunkMember => {
        return 'chunk' in value && value.chunk?.headers?.[':event-type']?.value === 'chunk';
      }),
      map((message) => {
        return parseSerdeChunkMessage(message.chunk);
      }),
      processCompletionChunks()
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
