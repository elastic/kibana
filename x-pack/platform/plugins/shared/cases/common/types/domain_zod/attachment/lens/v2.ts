/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LENS_ATTACHMENT_TYPE, LENS_SO_TYPE } from '../../../../constants/attachments';
import { jsonValueSchema } from '../../../../schema_zod';
import { buildSavedObjectMetadataSchema, TimeRangeSchema } from '../saved_object/v2';

// --- Persistable shape from legacy lens attachment ---
/** `state` shape is owned by the lens plugin; kept permissive to round-trip what lens persists. */
export const LensPersistableAttachmentDataSchema = z.object({
  state: z.record(z.string(), z.unknown()),
});
export type LensPersistableAttachmentData = z.infer<typeof LensPersistableAttachmentDataSchema>;

export const LensPersistableAttachmentPayloadSchema = z
  .object({
    type: z.literal(LENS_ATTACHMENT_TYPE),
    owner: z.string(),
    data: LensPersistableAttachmentDataSchema,
  })
  .strict();

// --- Reference shape from saved object lens attachment ---
// Snapshot of the Lens SO `attributes` at attach time. Intentionally opaque:
// the shape is owned by the Lens plugin and may evolve, so we round-trip it
// as JSON. The renderer reads only `attributes` and `references` from it.
const LensSavedObjectAttributesSchema = z.record(z.string(), jsonValueSchema);
export type LensSavedObjectAttributes = z.infer<typeof LensSavedObjectAttributesSchema>;
export const LensSavedObjectAttachmentDataSchema = z
  .object({
    attributes: LensSavedObjectAttributesSchema,
    timeRange: TimeRangeSchema.optional(),
  })
  .strict();
export type LensSavedObjectAttachmentData = z.infer<typeof LensSavedObjectAttachmentDataSchema>;
export type LensAttachmentData = LensPersistableAttachmentData | LensSavedObjectAttachmentData;

const LensSavedObjectAttachmentMetadataSchema = buildSavedObjectMetadataSchema(LENS_SO_TYPE);
export type LensSavedObjectAttachmentMetadata = z.infer<
  typeof LensSavedObjectAttachmentMetadataSchema
>;

export const LensSavedObjectAttachmentPayloadSchema = z
  .object({
    type: z.literal(LENS_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string(),
    metadata: LensSavedObjectAttachmentMetadataSchema,
    data: LensSavedObjectAttachmentDataSchema.optional(),
  })
  .strict();
export type LensSavedObjectAttachmentPayload = z.infer<
  typeof LensSavedObjectAttachmentPayloadSchema
>;

export const LensAttachmentPayloadSchema = z.union([
  LensPersistableAttachmentPayloadSchema,
  LensSavedObjectAttachmentPayloadSchema,
]);

export type LensAttachmentPayload = z.infer<typeof LensAttachmentPayloadSchema>;

/**
 * Narrows a lens attachment `data` to the persistable arm. The saved-object
 * arm always carries `attributes` and never `state`, so we use the absence of
 * `attributes` together with the presence of `state` as a discriminator —
 * `state in data` alone would misclassify any future SO snapshot that happens
 * to expose a `state` key inside `attributes`.
 */
export const isLensPersistableData = (data: unknown): data is LensPersistableAttachmentData =>
  typeof data === 'object' && data !== null && 'state' in data && !('attributes' in data);
