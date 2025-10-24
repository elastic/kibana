/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const SlackApiSecretsSchema = schema.object({
  token: schema.string({ minLength: 1 }),
});

export const SlackApiConfigSchema = schema.object({
  allowedChannels: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.maybe(schema.string({ minLength: 1 })),
        name: schema.string({ minLength: 1 }),
      }),
      { maxSize: 500 }
    )
  ),
});

export const ValidChannelIdSubActionParamsSchema = schema.object({
  channelId: schema.maybe(schema.string()),
});

export const ValidChannelIdParamsSchema = schema.object({
  subAction: schema.literal('validChannelId'),
  subActionParams: ValidChannelIdSubActionParamsSchema,
});

export const PostMessageSubActionParamsSchema = schema.object({
  /**
   * @deprecated Use `channelNames` or `channelIds` instead
   * `channelNames` takes priority over `channelIds` and `channels`
   */
  channels: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelNames: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 200, validate: validateChannelName }), { maxSize: 1 })
  ),
  text: schema.string({ minLength: 1 }),
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

export function validateChannelName(value?: string) {
  if (!value || value.length === 0) {
    return 'Channel name cannot be empty';
  }
  if (!value.startsWith('#')) {
    return 'Channel name must start with #';
  }
}

export const PostBlockkitSubActionParamsSchema = schema.object({
  /**
   * @deprecated Use `channelNames` or `channelIds` instead
   *`channelNames` takes priority over `channelIds` and `channels`
   */
  channels: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelNames: schema.maybe(
    schema.arrayOf(schema.string({ validate: validateChannelName }), { maxSize: 1 })
  ),
  text: schema.string({ validate: validateBlockkit }),
});

export const PostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: PostMessageSubActionParamsSchema,
});

export const PostBlockkitParamsSchema = schema.object({
  subAction: schema.literal('postBlockkit'),
  subActionParams: PostBlockkitSubActionParamsSchema,
});

export const SlackApiParamsSchema = schema.oneOf([
  ValidChannelIdParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
]);
