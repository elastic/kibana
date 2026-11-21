/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ToolCall } from '@kbn/inference-common';
import { MessageRole, ModelFamily, ModelProvider, ToolChoiceType } from '@kbn/inference-common';
import type { ChatCompleteRequestBody } from '../../common';
import type { PromptRequestBody } from '../../common/http_apis';

/** Identifiers: connector / tool call / profile / replacements / target ids. */
export const MAX_ID_LENGTH = 512;

/** Short identifiers and names: tool names, record keys, model names, plugin ids. */
export const MAX_NAME_LENGTH = 256;

/** Tool and prompt descriptions. */
export const MAX_DESCRIPTION_LENGTH = 1_000_000;

/**
 * Free-form LLM content: message content, system prompts and prompt templates.
 * The overall request body is still bounded by the server `maxPayload` setting.
 */
export const MAX_CONTENT_LENGTH = 1_000_000;

const idSchema = schema.string({ maxLength: MAX_ID_LENGTH });
const nameSchema = schema.string({ maxLength: MAX_NAME_LENGTH });
const descriptionSchema = schema.string({ maxLength: MAX_DESCRIPTION_LENGTH });
const contentSchema = schema.string({ maxLength: MAX_CONTENT_LENGTH });

export const toolCallSchema: Type<ToolCall[]> = schema.arrayOf(
  schema.object({
    toolCallId: idSchema,
    function: schema.object({
      name: nameSchema,
      arguments: schema.recordOf(nameSchema, schema.any()),
    }),
  }),
  { maxSize: 64 }
);

export const toolsSchema = schema.maybe(
  schema.recordOf(
    nameSchema,
    schema.object({
      description: descriptionSchema,
      schema: schema.maybe(
        schema.object({
          type: schema.literal('object'),
          properties: schema.recordOf(nameSchema, schema.any()),
          required: schema.maybe(schema.arrayOf(nameSchema, { maxSize: 100 })),
        })
      ),
    })
  )
);

export const toolChoiceSchema = schema.maybe(
  schema.oneOf([
    schema.literal(ToolChoiceType.auto),
    schema.literal(ToolChoiceType.none),
    schema.literal(ToolChoiceType.required),
    schema.object({
      function: nameSchema,
    }),
  ])
);

export const messageOptionsSchema = schema.object({
  tools: toolsSchema,
  toolChoice: toolChoiceSchema,
});

export const chatCompleteBaseSchema = schema.object({
  connectorId: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH }),
  maxRetries: schema.maybe(schema.number()),
  retryConfiguration: schema.maybe(
    schema.object({
      retryOn: schema.maybe(schema.oneOf([schema.literal('all'), schema.literal('auto')])),
    })
  ),
  temperature: schema.maybe(schema.number()),
  modelName: schema.maybe(nameSchema),
  metadata: schema.maybe(
    schema.object({
      connectorTelemetry: schema.maybe(
        schema.object({
          pluginId: schema.maybe(nameSchema),
          aggregateBy: schema.maybe(nameSchema),
        })
      ),
      anonymization: schema.maybe(
        schema.object({
          profileId: schema.maybe(idSchema),
          replacementsId: schema.maybe(idSchema),
          target: schema.maybe(
            schema.object({
              targetType: schema.oneOf([
                schema.literal('data_view'),
                schema.literal('index_pattern'),
                schema.literal('index'),
              ]),
              // May be a data view id, an index name, or a comma-separated index pattern list
              targetId: schema.string({ maxLength: 4096 }),
            })
          ),
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
    content: schema.oneOf([contentSchema, schema.literal(null)]),
    toolCalls: schema.maybe(toolCallSchema),
  }),
  schema.object({
    role: schema.literal(MessageRole.User),
    content: contentSchema,
    name: schema.maybe(nameSchema),
  }),
  schema.object({
    name: nameSchema,
    role: schema.literal(MessageRole.Tool),
    toolCallId: idSchema,
    response: schema.recordOf(nameSchema, schema.any()),
    data: schema.maybe(schema.recordOf(nameSchema, schema.any())),
  }),
]);

export const chatCompleteBodySchema: Type<ChatCompleteRequestBody> = schema.allOf([
  chatCompleteBaseSchema,
  messageOptionsSchema,
  schema.object({
    system: schema.maybe(contentSchema),
    messages: schema.arrayOf(messageSchema, { maxSize: 1000 }),
  }),
]);

const promptSchema = schema.object({
  prompt: schema.object({
    name: nameSchema,
    description: schema.maybe(descriptionSchema),
    versions: schema.arrayOf(
      schema.allOf([
        messageOptionsSchema,
        schema.object({
          system: schema.maybe(
            schema.oneOf([
              contentSchema,
              schema.object({
                mustache: schema.object({
                  template: contentSchema,
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
                  schema.literal(ModelFamily.Unknown),
                ]),
                id: schema.maybe(nameSchema),
              }),
              { maxSize: 20 }
            )
          ),
          template: schema.oneOf([
            schema.object({
              static: schema.object({
                content: contentSchema,
              }),
            }),
            schema.object({
              mustache: schema.object({
                template: contentSchema,
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
                    content: contentSchema,
                  }),
                  { maxSize: 100 }
                ),
              }),
            }),
          ]),
          temperature: schema.maybe(schema.number()),
        }),
      ]),
      { maxSize: 20 }
    ),
  }),
  input: schema.any(),
  prevMessages: schema.maybe(schema.arrayOf(messageSchema, { maxSize: 1000 })),
  toolChoice: toolChoiceSchema,
});

export const promptBodySchema: Type<PromptRequestBody> = schema.allOf([
  chatCompleteBaseSchema,
  promptSchema,
]);
