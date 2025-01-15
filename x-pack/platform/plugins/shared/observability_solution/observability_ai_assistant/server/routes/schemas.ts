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

const functionSchema = z.intersection(
  z.object({
    name: z.string(),
    description: z.string(),
  }),
  z.object({
    parameters: z.any().optional(),
  })
);

const chatCompleteBodyBaseSchema = z.intersection(
  z.object({
    messages: z.array(messageSchema),
    connectorId: z.string(),
    persist: BooleanFromPrimitiveType,
  }),
  z.object({
    conversationId: z.string().optional(),
    title: z.string().optional(),
    disableFunctions: z
      .union([
        BooleanFromPrimitiveType,
        z.object({
          except: z.array(z.string()),
        }),
      ])
      .optional(),
    instructions: z
      .array(
        z.intersection(
          z.object({
            id: z.string().optional(),
          }),
          z.object({
            text: z.string(),
            instruction_type: z.union([
              z.literal('user_instruction'),
              z.literal('application_instruction'),
            ]),
          })
        )
      )
      .optional(),
  })
);

const chatCompletePublicQuerySchema = z
  .object({
    format: z.union([z.literal('default'), z.literal('openai')]).optional(),
  })
  .optional();

const chatCompletePublicBodySchema = z.intersection(
  chatCompleteBodyBaseSchema,
  z.object({
    actions: z.array(functionSchema).optional(),
  })
);

export const chatCompletePublicParamsSchema = z.object({
  query: chatCompletePublicQuerySchema,
  body: chatCompletePublicBodySchema,
});
