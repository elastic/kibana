/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { MEMORY_KI_TYPES } from '../../../common/memory';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TAG_LENGTH,
  MAX_KI_TAGS,
  MAX_KI_TITLE_LENGTH,
} from '../../../common/step_types/ki';
import type { MemoryType } from '../../../common/http_api/memories';
import { aiIndexIdParamsSchema } from './ai_indices_schema';

const memoryTypeSchema = schema.oneOf(
  MEMORY_KI_TYPES.map((type) => schema.literal(type)) as [Type<MemoryType>],
  {
    meta: {
      description:
        'Use memory.session_fact for a granular fact or memory.session for a session synthesis.',
    },
  }
);

const ISO_DATE_TIME_WITH_OFFSET_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const validateIsoDate = (value: string): string | undefined =>
  !ISO_DATE_TIME_WITH_OFFSET_PATTERN.test(value) ||
  !moment.parseZone(value, moment.ISO_8601, true).isValid()
    ? 'Must be an ISO 8601 date-time with a UTC offset.'
    : undefined;

export const memoryWriteBodySchema = schema.object({
  type: memoryTypeSchema,
  title: schema.string({
    minLength: 1,
    maxLength: MAX_KI_TITLE_LENGTH,
    meta: { description: 'A short label for the memory.' },
  }),
  description: schema.string({
    minLength: 1,
    maxLength: MAX_KI_DESCRIPTION_LENGTH,
    meta: { description: 'A concise summary of the memory and its immediate consequence.' },
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
          'Optional index names, feature areas, or tools associated with the memory. On revision, omit to preserve existing tags or pass an empty array to clear them.',
      },
    })
  ),
  expires_at: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 64,
        validate: validateIsoDate,
        meta: {
          description:
            'ISO 8601 expiry timestamp. Omit to set expiry to 90 days after this write, including on revision, or pass null for a non-expiring memory.',
        },
      })
    )
  ),
  session_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_KI_ID_LENGTH,
      meta: {
        description:
          'A session ID returned by an earlier memory write. Omit to generate a new session ID.',
      },
    })
  ),
});

export const memoryCollectionParamsSchema = aiIndexIdParamsSchema;

export const memoryItemParamsSchema = schema.object({
  aiIndexId: aiIndexIdParamsSchema.getPropSchemas().aiIndexId,
  memoryId: schema.string({
    minLength: 1,
    maxLength: MAX_KI_ID_LENGTH,
    meta: { description: 'The memory identifier.' },
  }),
});

export const writeMemoryResponseSchema = () =>
  schema.object({
    id: schema.string({ meta: { description: 'The memory identifier.' } }),
    session_id: schema.string({ meta: { description: 'The memory session identifier.' } }),
  });

export const deleteMemoryResponseSchema = () =>
  schema.object({
    id: schema.string({ meta: { description: 'The tombstoned memory identifier.' } }),
  });
