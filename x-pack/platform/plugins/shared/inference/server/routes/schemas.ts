/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type, schema } from '@kbn/config-schema';
import {
  MessageRole,
  ModelFamily,
  ModelProvider,
  ToolCall,
  ToolChoiceType,
} from '@kbn/inference-common';
import { ChatCompleteRequestBody } from '../../common';
import { PromptRequestBody } from '../../common/http_apis';

export const toolCallSchema: Type<ToolCall[]> = schema.arrayOf(
  schema.object({
    toolCallId: schema.string(),
    function: schema.object({
      name: schema.string(),
      arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    }),
  })
);

export const messageOptionsSchema = schema.object({
  tools: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        description: schema.string(),
        schema: schema.maybe(
          schema.object({
            type: schema.literal('object'),
            properties: schema.recordOf(schema.string(), schema.any()),
            required: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      })
    )
  ),
  toolChoice: schema.maybe(
    schema.oneOf([
      schema.literal(ToolChoiceType.auto),
      schema.literal(ToolChoiceType.none),
      schema.literal(ToolChoiceType.required),
      schema.object({
        function: schema.string(),
      }),
    ])
  ),
});

export const chatCompleteBaseSchema = schema.object({
  connectorId: schema.string(),
  maxRetries: schema.maybe(schema.number()),
  retryConfiguration: schema.maybe(
    schema.object({
      retryOn: schema.maybe(schema.oneOf([schema.literal('all'), schema.literal('auto')])),
    })
  ),
  temperature: schema.maybe(schema.number()),
  modelName: schema.maybe(schema.string()),
  metadata: schema.maybe(
    schema.object({
      connectorTelemetry: schema.maybe(
        schema.object({
          pluginId: schema.maybe(schema.string()),
          aggregateBy: schema.maybe(schema.string()),
        })
      ),
      attributes: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    })
  ),
  functionCalling: schema.maybe(
    schema.oneOf([schema.literal('auto'), schema.literal('native'), schema.literal('simulated')])
  ),
});

const messageSchema = schema.oneOf([
  schema.object({
    role: schema.literal(MessageRole.Assistant),
    content: schema.oneOf([schema.string(), schema.literal(null)]),
    toolCalls: schema.maybe(toolCallSchema),
  }),
  schema.object({
    role: schema.literal(MessageRole.User),
    content: schema.string(),
    name: schema.maybe(schema.string()),
  }),
  schema.object({
    name: schema.string(),
    role: schema.literal(MessageRole.Tool),
    toolCallId: schema.string(),
    response: schema.recordOf(schema.string(), schema.any()),
    data: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }),
]);

export const chatCompleteBodySchema: Type<ChatCompleteRequestBody> = schema.allOf([
  chatCompleteBaseSchema,
  messageOptionsSchema,
  schema.object({
    system: schema.maybe(schema.string()),
    messages: schema.arrayOf(messageSchema),
  }),
]);

const promptSchema = schema.object({
  prompt: schema.object({
    name: schema.string(),
    description: schema.string(),
    versions: schema.arrayOf(
      schema.allOf([
        messageOptionsSchema,
        schema.object({
          system: schema.maybe(
            schema.oneOf([
              schema.string(),
              schema.object({
                mustache: schema.object({
                  template: schema.string(),
                }),
              }),
            ])
          ),
          models: schema.maybe(
            schema.arrayOf(
              schema.object({
                provider: schema.oneOf([
                  schema.literal(ModelProvider.Anthropic),
                  schema.literal(ModelProvider.Elastic),
                  schema.literal(ModelProvider.Google),
                  schema.literal(ModelProvider.OpenAI),
                  schema.literal(ModelProvider.Other),
                ]),
                family: schema.oneOf([
                  schema.literal(ModelFamily.Claude),
                  schema.literal(ModelFamily.GPT),
                  schema.literal(ModelFamily.Gemini),
                ]),
                id: schema.maybe(schema.string()),
              })
            )
          ),
          template: schema.oneOf([
            schema.object({
              static: schema.object({
                content: schema.string(),
              }),
            }),
            schema.object({
              mustache: schema.object({
                template: schema.string(),
              }),
            }),
            schema.object({
              chat: schema.object({
                messages: schema.arrayOf(
                  schema.object({
                    role: schema.oneOf([
                      schema.literal(MessageRole.User),
                      schema.literal(MessageRole.Assistant),
                    ]),
                    content: schema.string(),
                  })
                ),
              }),
            }),
          ]),
          temperature: schema.maybe(schema.number()),
        }),
      ])
    ),
  }),
  input: schema.any(),
  prevMessages: schema.maybe(schema.arrayOf(messageSchema)),
});

export const promptBodySchema: Type<PromptRequestBody> = schema.allOf([
  chatCompleteBaseSchema,
  promptSchema,
]);
