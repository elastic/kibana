/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromPrimitiveType } from '@kbn/zod-helpers';
import { type Message, MessageRole } from '../../common/types';

const messageSchema: z.ZodType<Message> = z.object({
  '@timestamp': z.string(),
  message: z.intersection(
    z.object({
      role: z.enum([
        MessageRole.System,
        MessageRole.Assistant,
        MessageRole.Function,
        MessageRole.User,
        MessageRole.Elastic,
      ]),
    }),
    z.object({
      content: z.string().optional(),
      name: z.string().optional(),
      event: z.string().optional(),
      data: z.string().optional(),
      function_call: z
        .intersection(
          z.object({
            name: z.string(),
            trigger: z.enum([MessageRole.Assistant, MessageRole.User, MessageRole.Elastic]),
          }),
          z.object({
            arguments: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
});

export const functionSchema = z.intersection(
  z.object({
    name: z.string().describe('Name of the function'),
    description: z.string().describe('Description of the function'),
  }),
  z.object({
    parameters: z.any().optional().describe('Parameters for the function'),
  })
);

export const chatCompleteBodyBaseSchema = z.intersection(
  z.object({
    messages: z
      .array(messageSchema)
      .describe('Array of message objects containing the conversation history'),
    connectorId: z.string().describe('Unique identifier for the connector'),
    persist: z.boolean().describe('Flag indicating whether to persist the conversation'),
  }),
  z.object({
    conversationId: z
      .string()
      .optional()
      .describe('Unique identifier for the conversation (if continuing a conversation)'),
    title: z.string().optional().describe('Title of the conversation'),
    disableFunctions: z
      .union([
        BooleanFromPrimitiveType,
        z.object({
          except: z.array(z.string()).describe('Array of function names to exclude from disabling'),
        }),
      ])
      .optional()
      .describe(
        'Control function availability. Can be either a boolean to disable all functions, or an object specifying exceptions.'
      ),
    instructions: z
      .array(
        z.intersection(
          z.object({
            id: z.string().optional().describe('Unique identifier for the instruction'),
          }),
          z.object({
            text: z.string().describe('The instruction content'),
            instruction_type: z
              .enum(['user_instruction', 'application_instruction'])
              .describe('Type of instruction'),
          })
        )
      )
      .optional()
      .describe('Array of instruction objects'),
  })
);

export const chatCompletePublicQuerySchema = z
  .object({
    format: z
      .enum(['default', 'openai'])
      .default('default')
      .optional()
      .describe(
        'Response format type. Values: "default", "openai".  If omitted, "default" is used.'
      ),
  })
  .optional();

export const chatCompletePublicBodySchema = z.intersection(
  chatCompleteBodyBaseSchema,
  z.object({
    actions: z
      .array(functionSchema)
      .optional()
      .describe('Array of function objects defining available actions'),
  })
);

export const chatCompletePublicParamsSchema = z.object({
  query: chatCompletePublicQuerySchema,
  body: chatCompletePublicBodySchema,
});
