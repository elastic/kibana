/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Gemini from '@google/generative-ai';
import { defer, map } from 'rxjs';
import type { Message, ToolOptions, ToolSchema, ToolSchemaType } from '@kbn/inference-common';
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import type { InferenceConnectorAdapter } from '../../types';
import { handleConnectorDataResponse, handleConnectorStreamResponse } from '../../utils';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import { processVertexStream, processVertexResponse } from './process_vertex_stream';
import type {
  GenerateContentResponseChunk,
  GeminiMessage,
  GeminiToolConfig,
  GenerateContentResponse,
} from './types';
import { getTemperatureIfValid } from '../../utils/get_temperature';
import { mustUseThoughtSignature } from './utils';

export const geminiAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    temperature = 0,
    modelName,
    abortSignal,
    metadata,
    timeout,
    stream = false,
  }) => {
    const connector = executor.getConnector();
    const useThoughtSignature = mustUseThoughtSignature(
      modelName ?? connector.config?.defaultModel
    );

    const connectorResult$ = defer(() => {
      return executor.invoke({
        subAction: stream ? 'invokeStream' : 'invokeAIRaw',
        subActionParams: {
          messages: messagesToGemini({ messages, useThoughtSignature }),
          systemInstruction: system,
          tools: toolsToGemini(tools),
          toolConfig: toolChoiceToConfig(toolChoice),
          ...getTemperatureIfValid(temperature, { connector, modelName }),
          model: modelName,
          signal: abortSignal,
          stopSequences: ['\n\nHuman:'],
          ...(metadata?.connectorTelemetry
            ? { telemetryMetadata: metadata.connectorTelemetry }
            : {}),
          ...(typeof timeout === 'number' && isFinite(timeout) ? { timeout } : {}),
        },
      });
    });

    if (stream) {
      return connectorResult$.pipe(
        handleConnectorStreamResponse({ processStream: eventSourceStreamIntoObservable }),
        map((line) => JSON.parse(line) as GenerateContentResponseChunk),
        processVertexStream(modelName)
      );
    } else {
      return connectorResult$.pipe(
        handleConnectorDataResponse({
          parseData: (data) => data as GenerateContentResponse,
        }),
        processVertexResponse(modelName)
      );
    }
  },
};

function toolChoiceToConfig(toolChoice: ToolOptions['toolChoice']): GeminiToolConfig | undefined {
  if (toolChoice === ToolChoiceType.required) {
    return {
      mode: 'ANY',
    };
  } else if (toolChoice === ToolChoiceType.none) {
    return {
      mode: 'NONE',
    };
  } else if (toolChoice === ToolChoiceType.auto) {
    return {
      mode: 'AUTO',
    };
  } else if (toolChoice) {
    return {
      mode: 'ANY',
      allowedFunctionNames: [toolChoice.function],
    };
  }
  return undefined;
}

function toolsToGemini(tools: ToolOptions['tools']): Gemini.Tool[] {
  return tools
    ? [
        {
          functionDeclarations: Object.entries(tools ?? {}).map(
            ([toolName, { description, schema }]) => {
              return {
                name: toolName,
                description,
                parameters: schema
                  ? toolSchemaToGemini({ schema })
                  : {
                      type: Gemini.SchemaType.OBJECT,
                      properties: {},
                    },
              };
            }
          ),
        },
      ]
    : [];
}

function toolSchemaToGemini({ schema }: { schema: ToolSchema }): Gemini.FunctionDeclarationSchema {
  const convertSchemaType = ({
    def,
  }: {
    def: ToolSchemaType;
  }): Gemini.FunctionDeclarationSchemaProperty => {
    switch (def.type) {
      case 'array':
        return {
          type: Gemini.SchemaType.ARRAY,
          description: def.description,
          items: convertSchemaType({ def: def.items }),
        };
      case 'object':
        return {
          type: Gemini.SchemaType.OBJECT,
          description: def.description,
          required: def.required as string[],
          properties: def.properties
            ? Object.entries(def.properties).reduce<Record<string, Gemini.Schema>>(
                (properties, [key, prop]) => {
                  properties[key] = convertSchemaType({
                    def: prop,
                  }) as Gemini.Schema;
                  return properties;
                },
                {}
              )
            : {},
        };
      case 'string':
        return {
          type: Gemini.SchemaType.STRING,
          format: 'enum',
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : [],
        };
      case 'boolean':
        return {
          type: Gemini.SchemaType.BOOLEAN,
          description: def.description,
        };
      case 'number':
        return {
          type: Gemini.SchemaType.NUMBER,
          description: def.description,
        };
    }
  };

  return {
    type: Gemini.SchemaType.OBJECT,
    required: schema.required as string[],
    properties: Object.entries(schema.properties ?? {}).reduce<
      Record<string, Gemini.FunctionDeclarationSchemaProperty>
    >((properties, [key, def]) => {
      properties[key] = convertSchemaType({ def });
      return properties;
    }, {}),
  };
}

const skipThoughtSignatureHash = 'skip_thought_signature_validator';

function messagesToGemini({
  messages,
  useThoughtSignature,
}: {
  messages: Message[];
  useThoughtSignature: boolean;
}): GeminiMessage[] {
  let mapped = messages.map(messageToGeminiMapper()).reduce<GeminiMessage[]>((output, message) => {
    // merging consecutive messages from the same user, as Gemini requires multi-turn messages
    const previousMessage = output.length ? output[output.length - 1] : undefined;
    if (previousMessage?.role === message.role) {
      previousMessage.parts.push(...message.parts);
    } else {
      output.push(message);
    }
    return output;
  }, []);

  if (useThoughtSignature) {
    mapped = mapped.map((message, index, array) => {
      if (index < array.length - 1) {
        addThoughtSignatureToFirstFunctionCall(message);
      }
      return message;
    });
  }

  return mapped;
}

const addThoughtSignatureToFirstFunctionCall = (message: GeminiMessage) => {
  for (const part of message.parts) {
    if (part.functionCall) {
      // @ts-expect-error - Gemini types are not up to date, this is a valid property
      part.thoughtSignature = skipThoughtSignatureHash;
      break;
    }
  }
};

function messageToGeminiMapper() {
  return (message: Message): GeminiMessage => {
    const role = message.role;

    switch (role) {
      case MessageRole.Assistant:
        const assistantMessage: GeminiMessage = {
          role: 'assistant',
          parts: [
            ...(message.content ? [{ text: message.content }] : []),
            ...(message.toolCalls ?? []).map((toolCall) => {
              return {
                functionCall: {
                  name: toolCall.function.name,
                  args: ('arguments' in toolCall.function
                    ? toolCall.function.arguments
                    : {}) as object,
                },
              };
            }),
          ],
        };
        return assistantMessage;

      case MessageRole.User:
        const userMessage: GeminiMessage = {
          role: 'user',
          parts: (typeof message.content === 'string' ? [message.content] : message.content).map(
            (contentPart) => {
              if (typeof contentPart === 'string') {
                return { text: contentPart } satisfies Gemini.TextPart;
              } else if (contentPart.type === 'text') {
                return { text: contentPart.text } satisfies Gemini.TextPart;
              }
              return {
                inlineData: {
                  data: contentPart.source.data,
                  mimeType: contentPart.source.mimeType,
                },
              } satisfies Gemini.InlineDataPart;
            }
          ),
        };
        return userMessage;

      case MessageRole.Tool:
        // tool responses are provided as user messages
        const toolMessage: GeminiMessage = {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: message.toolCallId,
                // gemini expects a structured response shape, making sure we're not sending a string
                response:
                  typeof message.response === 'string'
                    ? { response: message.response }
                    : message.response,
              },
            },
          ],
        };
        return toolMessage;
    }
  };
}
