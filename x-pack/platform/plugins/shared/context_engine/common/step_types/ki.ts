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
export const MAX_KI_REFERENCES = 100;
export const MAX_KI_REFERENCE_URI_LENGTH = 2048;
export const MAX_KI_REFERENCE_DESCRIPTION_LENGTH = 2048;

export const KI_REFERENCE_RELATIONS = ['derived_from', 'relates_to', 'supersedes'] as const;
export const KI_LIFECYCLE_STATUSES = ['active', 'deleted'] as const;

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

export const kiReferenceRelationSchema = z
  .enum(KI_REFERENCE_RELATIONS)
  .describe('How the URI relates to this KI');
export type KiReferenceRelation = z.infer<typeof kiReferenceRelationSchema>;

export const kiLifecycleStatusSchema = z
  .enum(KI_LIFECYCLE_STATUSES)
  .describe('Lifecycle status of the KI. Unset reads as active');
export type KiLifecycleStatus = z.infer<typeof kiLifecycleStatusSchema>;

/** A URI this KI relates to. */
export const kiReferenceSchema = z.object({
  uri: z
    .string()
    .min(1)
    .max(MAX_KI_REFERENCE_URI_LENGTH)
    .describe('The referenced URI, for example index://logs-*'),
  relation: kiReferenceRelationSchema.optional(),
  description: z
    .string()
    .max(MAX_KI_REFERENCE_DESCRIPTION_LENGTH)
    .optional()
    .describe('Why this reference exists'),
});

type KiAttributeValue = string | number | boolean | string[];

const omitNullAttributes = (
  attributes: Record<string, KiAttributeValue | null>
): Record<string, KiAttributeValue> =>
  Object.fromEntries(
    Object.entries(attributes).filter(
      (entry): entry is [string, KiAttributeValue] => entry[1] !== null
    )
  );

/**
 * Drops attributes whose value is `null`, the workflow convention for "omit this attribute"
 * (`${{ value | default: nil }}`), and the `attributes` key itself when nothing is left. The
 * schema's transform does the same, but the workflow engine hands step handlers the rendered
 * input without parsing it, so the KI steps call this themselves. Other fields are untouched: a
 * null `expires_at` on update still clears the expiry.
 */
export const omitNullKiAttributes = <
  T extends { [field: string]: unknown; attributes?: Record<string, KiAttributeValue | null> }
>(
  ki: T
): T => {
  const { attributes } = ki;
  if (!attributes) {
    return ki;
  }
  const kept = omitNullAttributes(attributes);
  if (Object.keys(attributes).length > 0 && Object.keys(kept).length === 0) {
    const withoutAttributes = { ...ki };
    delete withoutAttributes.attributes;
    return withoutAttributes;
  }
  return { ...ki, attributes: kept };
};

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
        // A `null` value omits the attribute, so a workflow can write `${{ value | default: nil }}`
        // for an attribute that only sometimes applies (an `esql` list that came back empty).
        z.null(),
      ])
    )
    .refine((attrs) => Object.keys(attrs).length <= MAX_KI_ATTRIBUTES, {
      message: `attributes must have at most ${MAX_KI_ATTRIBUTES} entries`,
    })
    .transform(omitNullAttributes)
    .optional()
    .describe(
      'Arbitrary key-value attributes attached to the KI. A null value omits the attribute.'
    ),
  references: z
    .array(kiReferenceSchema)
    .max(MAX_KI_REFERENCES)
    .optional()
    .describe('URIs this KI relates to'),
  expires_at: z.iso
    .datetime({ offset: true })
    .optional()
    .describe('Expiry date in ISO 8601. Leave unset and the KI never expires'),
});

/** The subset of KI fields that can be changed by an update. A null `expires_at` clears the expiry. */
export const kiPartialFieldsSchema = kiFieldsSchema.partial().extend({
  expires_at: kiFieldsSchema.shape.expires_at.nullable(),
});

export type KiFields = z.infer<typeof kiFieldsSchema>;
export type KiPartialFields = z.infer<typeof kiPartialFieldsSchema>;
