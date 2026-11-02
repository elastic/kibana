/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  DEFAULT_SESSION_LIST_SIZE,
  DEFAULT_SESSION_MEMORY_SEARCH_SIZE,
  MAX_SESSION_EVENT_TRANSCRIPT_LENGTH,
  MAX_SESSION_LIST_SIZE,
  MAX_SESSION_MEMORY_AI_INDEX_IDS,
  MAX_SESSION_MEMORY_CONTENT_LENGTH,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_MEDIA_ITEMS,
  MAX_SESSION_MEMORY_MEDIA_VALUE_LENGTH,
  MAX_SESSION_MEMORY_SEARCH_SIZE,
} from '../../../common/constants';
import type {
  SessionMemoryMediaFormat,
  SessionMemoryMediaItem,
  SessionMemoryMediaType,
} from '../../../common/http_api/session_memory';

const idSchema = schema.string({ minLength: 1, maxLength: MAX_SESSION_MEMORY_ID_LENGTH });
const optionalIdSchema = schema.maybe(idSchema);
const aiIndexIdsSchema = schema.maybe(
  schema.arrayOf(idSchema, { maxSize: MAX_SESSION_MEMORY_AI_INDEX_IDS })
);

const mediaTypeSchema: Type<SessionMemoryMediaType> = schema.oneOf([
  schema.literal('image'),
  schema.literal('pdf'),
]);

const mediaFormatSchema: Type<SessionMemoryMediaFormat> = schema.oneOf([
  schema.literal('base64'),
  schema.literal('url'),
]);

/** Shape shared by stored `media` items and a media search `query`. */
export const mediaItemSchema: Type<SessionMemoryMediaItem> = schema.object({
  type: mediaTypeSchema,
  value: schema.string({ minLength: 1, maxLength: MAX_SESSION_MEMORY_MEDIA_VALUE_LENGTH }),
  format: schema.maybe(mediaFormatSchema),
});

export const rememberSessionMemoryBodySchema = schema.object(
  {
    session_id: idSchema,
    user_id: idSchema,
    agent_id: idSchema,
    space: optionalIdSchema,
    ai_index_id: aiIndexIdsSchema,
    type: optionalIdSchema,
    content: schema.maybe(schema.string({ maxLength: MAX_SESSION_MEMORY_CONTENT_LENGTH })),
    media: schema.maybe(
      schema.arrayOf(mediaItemSchema, { maxSize: MAX_SESSION_MEMORY_MEDIA_ITEMS })
    ),
    attributes: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  },
  {
    validate: ({ content, media }) => {
      if (!content?.trim() && !media?.length) {
        return 'A memory needs [content] or [media]';
      }
    },
  }
);

export const searchSessionMemoryBodySchema = schema.object({
  query: schema.oneOf([schema.string({ minLength: 1 }), mediaItemSchema]),
  session_id: optionalIdSchema,
  user_id: optionalIdSchema,
  agent_id: optionalIdSchema,
  space: optionalIdSchema,
  ai_index_id: optionalIdSchema,
  size: schema.number({
    min: 1,
    max: MAX_SESSION_MEMORY_SEARCH_SIZE,
    defaultValue: DEFAULT_SESSION_MEMORY_SEARCH_SIZE,
  }),
});

export const sessionIdParamsSchema = schema.object({ sessionId: idSchema });

export const sessionScopeQuerySchema = schema.object({
  space: optionalIdSchema,
  ai_index_id: optionalIdSchema,
  size: schema.number({
    min: 1,
    max: MAX_SESSION_LIST_SIZE,
    defaultValue: DEFAULT_SESSION_LIST_SIZE,
  }),
});

export const saveSessionEventBodySchema = schema.object({
  session_id: idSchema,
  user_id: idSchema,
  agent_id: idSchema,
  round_id: optionalIdSchema,
  space: optionalIdSchema,
  ai_index_id: aiIndexIdsSchema,
  transcript: schema.string({ minLength: 1, maxLength: MAX_SESSION_EVENT_TRANSCRIPT_LENGTH }),
});
