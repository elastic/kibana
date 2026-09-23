/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_AI_INDEX_ID_LENGTH } from '../constants';

export const MAX_KI_ID_LENGTH = 512;
export const MAX_KI_TYPE_LENGTH = 256;
export const MAX_KI_TITLE_LENGTH = 512;
export const MAX_KI_DESCRIPTION_LENGTH = 2048;
export const MAX_KI_CONTENT_LENGTH = 65536;
export const MAX_KI_TAG_LENGTH = 256;
export const MAX_KI_TAGS = 100;
export const MAX_KI_ATTRIBUTE_KEY_LENGTH = 256;
/** Must fit a max-length ES|QL query carried in `attributes.esql`. */
export const MAX_KI_ATTRIBUTE_VALUE_LENGTH = 10_000;
export const MAX_KI_ATTRIBUTE_ARRAY_VALUES = 100;
export const MAX_KI_ATTRIBUTES = 100;

export const aiIndexIdSchema = z
  .string()
  .min(1)
  .max(MAX_AI_INDEX_ID_LENGTH)
  .describe('The id of the AI index the knowledge indicator belongs to');

export const kiIdSchema = z
  .string()
  .min(1)
  .max(MAX_KI_ID_LENGTH)
  .describe('The document id of the knowledge indicator');

/**
 * A Knowledge Indicator (KI) document. Fields mirror the base AI index
 * mappings (`ai-index@mappings`).
 */
export const kiFieldsSchema = z.object({
  type: z
    .string()
    .min(1)
    .max(MAX_KI_TYPE_LENGTH)
    .describe('The KI type (e.g. index_metadata, document, detection)'),
  title: z.string().min(1).max(MAX_KI_TITLE_LENGTH).describe('A short title for the KI'),
  description: z
    .string()
    .max(MAX_KI_DESCRIPTION_LENGTH)
    .optional()
    .describe('A one-line description of the KI'),
  content: z
    .string()
    .max(MAX_KI_CONTENT_LENGTH)
    .optional()
    .describe('The knowledge content of the KI'),
  tags: z
    .array(z.string().min(1).max(MAX_KI_TAG_LENGTH))
    .max(MAX_KI_TAGS)
    .optional()
    .describe('Tags used to categorize the KI'),
  attributes: z
    .record(
      z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH),
      z.union([
        z.string().max(MAX_KI_ATTRIBUTE_VALUE_LENGTH),
        z.number(),
        z.boolean(),
        z.array(z.string().max(MAX_KI_ATTRIBUTE_VALUE_LENGTH)).max(MAX_KI_ATTRIBUTE_ARRAY_VALUES),
      ])
    )
    .refine((attrs) => Object.keys(attrs).length <= MAX_KI_ATTRIBUTES, {
      message: `attributes must have at most ${MAX_KI_ATTRIBUTES} entries`,
    })
    .optional()
    .describe('Arbitrary key-value attributes attached to the KI'),
});

/** The subset of KI fields that can be changed by an update. */
export const kiPartialFieldsSchema = kiFieldsSchema.partial();

export type KiFields = z.infer<typeof kiFieldsSchema>;
export type KiPartialFields = z.infer<typeof kiPartialFieldsSchema>;
