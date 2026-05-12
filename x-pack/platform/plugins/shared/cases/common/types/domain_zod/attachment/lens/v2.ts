/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LENS_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/**
 * Lens has two payload arms, modelled as a top-level discriminated union:
 *
 * - `persistable` (value-typed) – legacy markdown-editor inserts that carry the
 *   full persistable embeddable state in `data.state`.
 * - `savedObject` (reference-typed) – attachments created from the saved-object
 *   modal. Carries the lens SO id in `attachmentId` plus `metadata.config`
 *   (a verbatim `LensSavedObjectAttributes` snapshot with `references` inlined)
 *   so the renderer can fall back to an inline render if the live SO fetch
 *   fails. `metadata.soType` is `'lens'` (mirrors the files-migration `soType`
 *   convention used for SO-ref bookkeeping).
 */

const TimeRangeSchema = z.object({ from: z.string(), to: z.string() }).strict();

/** Persistable arm — `data.state` carries the full embeddable state. */
export const LensPersistableAttachmentPayloadSchema = z
  .object({
    type: z.literal(LENS_ATTACHMENT_TYPE),
    owner: z.string(),
    data: z
      .object({
        state: z.record(z.string(), z.unknown()),
      })
      .strict(),
  })
  .strict();

/** SO-ref arm — `attachmentId` + optional `metadata.config` snapshot. */
export const LensSavedObjectAttachmentPayloadSchema = z
  .object({
    type: z.literal(LENS_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string(),
    metadata: z
      .object({
        title: z.string(),
        soType: z.literal('lens'),
        /**
         * Verbatim `LensSavedObjectAttributes` snapshot (with `references`
         * inlined) used as the inline-render fallback when the live SO fetch
         * fails. Optional so older attachments still validate.
         */
        config: z.record(z.string(), z.unknown()).optional(),
        timeRange: TimeRangeSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const LensAttachmentPayloadSchema = z.union([
  LensPersistableAttachmentPayloadSchema,
  LensSavedObjectAttachmentPayloadSchema,
]);

export type LensPersistableAttachmentPayload = z.infer<
  typeof LensPersistableAttachmentPayloadSchema
>;
export type LensSavedObjectAttachmentPayload = z.infer<
  typeof LensSavedObjectAttachmentPayloadSchema
>;
export type LensAttachmentPayload = z.infer<typeof LensAttachmentPayloadSchema>;

/** Persistable `data` shape exposed to the renderer (value arm). */
export type LensPersistableAttachmentData = LensPersistableAttachmentPayload['data'];
/** SO-ref `metadata` shape exposed to the renderer (reference arm). */
export type LensSavedObjectAttachmentMetadata = LensSavedObjectAttachmentPayload['metadata'];

/** Narrowing helper at the renderer boundary. */
export const isLensPersistableData = (data: unknown): data is LensPersistableAttachmentData =>
  typeof data === 'object' && data !== null && 'state' in data;
