/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS } from '../../../common/memory';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TAG_LENGTH,
  MAX_KI_TAGS,
  MAX_KI_TITLE_LENGTH,
} from '../../../common/step_types/ki';

const MAX_ISO_DATE_LENGTH = 64;

const memoryIdSchema = (description: string) =>
  schema.string({ minLength: 1, maxLength: MAX_KI_ID_LENGTH, meta: { description } });

export const rememberMemoryBodySchema = schema.object({
  id: schema.maybe(
    memoryIdSchema('The id of an existing memory to revise. Omit to create a new memory.')
  ),
  session_id: schema.maybe(
    memoryIdSchema(
      'Groups memories from one session. Omit to start a new session; the generated id is returned.'
    )
  ),
  type: schema.oneOf([schema.literal('memory.session'), schema.literal('memory.session_fact')], {
    meta: {
      description:
        '`memory.session_fact` for one fact learned in a session, or `memory.session` for a summary of the session.',
    },
  }),
  title: schema.string({
    minLength: 1,
    maxLength: MAX_KI_TITLE_LENGTH,
    meta: { description: 'A short label for the memory.' },
  }),
  description: schema.string({
    minLength: 1,
    maxLength: MAX_KI_DESCRIPTION_LENGTH,
    meta: { description: 'A concise description of the memory.' },
  }),
  content: schema.string({
    minLength: 1,
    maxLength: MAX_KI_CONTENT_LENGTH,
    meta: { description: 'Enough context to use the memory without re-deriving it.' },
  }),
  tags: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_KI_TAG_LENGTH }), {
      maxSize: MAX_KI_TAGS,
      meta: {
        description:
          'Optional tags. When revising, omit to keep the existing tags or pass an empty array to clear them.',
      },
    })
  ),
  expires_at: schema.maybe(
    schema.string({
      maxLength: MAX_ISO_DATE_LENGTH,
      validate: (value) =>
        Number.isNaN(Date.parse(value)) ? 'expires_at must be an ISO 8601 date.' : undefined,
      meta: {
        description: `When the memory stops being recalled. Defaults to, and may be at most, ${MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS} days from now.`,
      },
    })
  ),
});

export const forgetMemoryBodySchema = schema.object({
  id: memoryIdSchema('The id of the memory to forget.'),
});

export const enableMemoryDreamingBodySchema = schema.nullable(
  schema.object({
    scheduled: schema.boolean({
      defaultValue: true,
      meta: { description: 'When false, dreaming only runs from "Dream now".' },
    }),
    rebuild: schema.boolean({
      defaultValue: false,
      meta: {
        description:
          "Temporary, for testing: every dream deletes the space's long-term memories and rebuilds them from all short-term memories.",
      },
    }),
  })
);

export const rememberMemoryResponseSchema = () =>
  schema.object({
    id: schema.string({ meta: { description: 'The id of the memory.' } }),
    session_id: schema.string({ meta: { description: 'The session the memory belongs to.' } }),
  });

export const forgetMemoryResponseSchema = () =>
  schema.object({
    id: schema.string({ meta: { description: 'The id of the forgotten memory.' } }),
  });
