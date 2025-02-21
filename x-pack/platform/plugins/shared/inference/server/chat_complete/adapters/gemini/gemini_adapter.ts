/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Gemini from '@google/generative-ai';
import { from, map, switchMap, throwError } from 'rxjs';
import { isReadable, Readable } from 'stream';
import {
  createInferenceInternalError,
  Message,
  MessageRole,
  ToolChoiceType,
  ToolOptions,
  ToolSchema,
  ToolSchemaType,
} from '@kbn/inference-common';
import type { InferenceConnectorAdapter } from '../../types';
import { convertUpstreamError } from '../../utils';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import { processVertexStream } from './process_vertex_stream';
import type { GenerateContentResponseChunk, GeminiMessage, GeminiToolConfig } from './types';

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
  }) => {
    return from(
      executor.invoke({
        subAction: 'invokeStream',
        subActionParams: {
          messages: messagesToGemini({ messages }),
          systemInstruction: system,
          tools: toolsToGemini(tools),
          toolConfig: toolChoiceToConfig(toolChoice),
          temperature,
          model: modelName,
          signal: abortSignal,
          stopSequences: ['\n\nHuman:'],
          ...(metadata?.connectorTelemetry
            ? { telemetryMetadata: metadata.connectorTelemetry }
            : {}),
        },
      })
    ).pipe(
      switchMap((response) => {
        if (response.status === 'error') {
          return throwError(() =>
            convertUpstreamError(response.serviceMessage!, {
              messagePrefix: 'Error calling connector:',
            })
          );
        }
        if (isReadable(response.data as any)) {
          return eventSourceStreamIntoObservable(response.data as Readable);
        }
        return throwError(() =>
          createInferenceInternalError('Unexpected error', response.data as Record<string, any>)
        );
      }),
      map((line) => {
        return JSON.parse(line) as GenerateContentResponseChunk;
      }),
      processVertexStream()
    );
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
                      type: Gemini.FunctionDeclarationSchemaType.OBJECT,
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
          type: Gemini.FunctionDeclarationSchemaType.ARRAY,
          description: def.description,
          items: convertSchemaType({ def: def.items }) as Gemini.FunctionDeclarationSchema,
        };
      case 'object':
        return {
          type: Gemini.FunctionDeclarationSchemaType.OBJECT,
          description: def.description,
          required: def.required as string[],
          properties: def.properties
            ? Object.entries(def.properties).reduce<
                Record<string, Gemini.FunctionDeclarationSchema>
              >((properties, [key, prop]) => {
                properties[key] = convertSchemaType({
                  def: prop,
                }) as Gemini.FunctionDeclarationSchema;
                return properties;
              }, {})
            : undefined,
        };
      case 'string':
        return {
          type: Gemini.FunctionDeclarationSchemaType.STRING,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
      case 'boolean':
        return {
          type: Gemini.FunctionDeclarationSchemaType.BOOLEAN,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
      case 'number':
        return {
          type: Gemini.FunctionDeclarationSchemaType.NUMBER,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
    }
  };

  return {
    type: Gemini.FunctionDeclarationSchemaType.OBJECT,
    required: schema.required as string[],
    properties: Object.entries(schema.properties ?? {}).reduce<
      Record<string, Gemini.FunctionDeclarationSchemaProperty>
    >((properties, [key, def]) => {
      properties[key] = convertSchemaType({ def });
      return properties;
    }, {}),
  };
}

function messagesToGemini({ messages }: { messages: Message[] }): GeminiMessage[] {
  return messages.map(messageToGeminiMapper()).reduce<GeminiMessage[]>((output, message) => {
    // merging consecutive messages from the same user, as Gemini requires multi-turn messages
    const previousMessage = output.length ? output[output.length - 1] : undefined;
    if (previousMessage?.role === message.role) {
      previousMessage.parts.push(...message.parts);
    } else {
      output.push(message);
    }
    return output;
  }, []);
}

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
                response: (typeof message.response === 'string'
                  ? { response: message.response }
                  : (message.response as string)) as object,
              },
            },
          ],
        };
        return toolMessage;
    }
  };
}
