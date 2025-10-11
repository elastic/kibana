/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const SlackApiSecretsSchema = z.object({
  token: z.string().min(1),
});

export const SlackApiConfigSchema = z.object({
  allowedChannels: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      })
    )
    .max(25)
    .optional(),
  defaultChannel: z.string().min(1).optional(),
});

export const ValidChannelIdSubActionParamsSchema = z.object({
  channelId: z.string().optional(),
});

export const ValidChannelIdParamsSchema = z.object({
  subAction: z.literal('validChannelId'),
  subActionParams: ValidChannelIdSubActionParamsSchema,
});

export const PostMessageSubActionParamsSchema = z.object({
  channels: z.array(z.string()).max(1).optional(),
  channelIds: z.array(z.string()).max(1).optional(),
  text: z.string().min(1),
});

export function validateBlockkit(text: string) {
  try {
    const parsedText = JSON.parse(text);

    if (!Object.hasOwn(parsedText, 'blocks')) {
      return 'block kit body must contain field "blocks"';
    }
  } catch (err) {
    return `block kit body is not valid JSON - ${err.message}`;
  }
}

export const PostBlockkitSubActionParamsSchema = z.object({
  channels: z.array(z.string()).max(1).optional(),
  channelIds: z.array(z.string()).max(1).optional(),
  text: z.string().superRefine((text, ctx) => {
    try {
      const parsedText = JSON.parse(text);

      if (!Object.hasOwn(parsedText, 'blocks')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'block kit body must contain field "blocks"',
        });
      }
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `block kit body is not valid JSON - ${err.message}`,
      });
    }
  }),
});

export const PostMessageParamsSchema = z.object({
  subAction: z.literal('postMessage'),
  subActionParams: PostMessageSubActionParamsSchema,
});

export const PostBlockkitParamsSchema = z.object({
  subAction: z.literal('postBlockkit'),
  subActionParams: PostBlockkitSubActionParamsSchema,
});

export const SlackApiParamsSchema = z.union([
  ValidChannelIdParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
]);
