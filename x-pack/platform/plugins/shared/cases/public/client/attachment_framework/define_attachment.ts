/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type {
  ReferenceData,
  UnifiedHybridAttachmentType,
  UnifiedReferenceAttachmentType,
  UnifiedValueAttachmentType,
} from './types';

/**
 * READ ME:
 * `defineAttachment()` is the public helper used by unified attachment registrations.
 * It infers renderer prop types from the attachment's full Zod payload schema:
 *  - reference payloads: contain `attachmentId`
 *  - value payloads: contain inline `data` and no `attachmentId`
 *  - hybrid payloads: support both reference and value payload shapes
 *
 * The inferred type is used only at the call site, so attachment renderers get precise
 * `attachmentId`, `metadata`, and `data` types.
 *
 * For hybrid registrations, the renderer receives `data?: ValueData | ReferenceData`
 * (always optional) because the reference arm makes inline data optional. The
 * renderer is responsible for narrowing the two arms at runtime.
 *
 * The returned value is widened before entering the registry. This avoids TypeScript
 * contravariance issues when storing many attachment registrations with different
 * renderer prop types in one registry.
 */

type PayloadFromSchema<S extends z.ZodType> = z.infer<S>;

/** Schema branch with an attachment id. */
type ReferencePayloadFromSchema<S extends z.ZodType> = Extract<
  PayloadFromSchema<S>,
  { attachmentId: unknown }
>;

/** Schema branch with inline data and no attachment id. */
type ValuePayloadFromSchema<S extends z.ZodType> = Exclude<
  Extract<PayloadFromSchema<S>, { data: unknown }>,
  { attachmentId: unknown }
>;

/** True when the schema accepts a reference payload. */
type HasReferenceSchema<S extends z.ZodType> = [ReferencePayloadFromSchema<S>] extends [never]
  ? false
  : true;

/** True when the schema accepts a value payload. */
type HasValueSchema<S extends z.ZodType> = [ValuePayloadFromSchema<S>] extends [never]
  ? false
  : true;

/** Data passed to reference renderers, falling back to the base reference payload shape. */
type ReferenceDataFromSchema<S extends z.ZodType> =
  'data' extends keyof ReferencePayloadFromSchema<S>
    ? ReferencePayloadFromSchema<S> extends { data?: infer D }
      ? D
      : ReferenceData
    : ReferenceData;

/** Data passed to value renderers. */
type ValueDataFromSchema<S extends z.ZodType> = ValuePayloadFromSchema<S> extends { data: infer D }
  ? D
  : never;

/** Data passed to hybrid renderers. */
type HybridDataFromSchema<S extends z.ZodType> =
  | ValueDataFromSchema<S>
  | ReferenceDataFromSchema<S>;

/** Renderer props are inferred from the full payload schema passed at registration. */
type UnifiedAttachmentTypeFromSchema<S extends z.ZodType> = HasReferenceSchema<S> extends true
  ? HasValueSchema<S> extends true
    ? UnifiedHybridAttachmentType<
        HybridDataFromSchema<S>,
        ReferencePayloadFromSchema<S> extends { metadata?: infer M } ? M : never,
        ReferencePayloadFromSchema<S> extends { attachmentId: infer A } ? A : never
      >
    : UnifiedReferenceAttachmentType<
        ReferencePayloadFromSchema<S> extends { metadata?: infer M } ? M : never,
        ReferencePayloadFromSchema<S> extends { attachmentId: infer A } ? A : never,
        ReferenceDataFromSchema<S>
      >
  : UnifiedValueAttachmentType<ValueDataFromSchema<S>>;

/** Registry consumers need the broad attachment type to avoid renderer prop intersections. */
type UnifiedAttachmentTypeForRegistry<S extends z.ZodType> = HasReferenceSchema<S> extends true
  ? HasValueSchema<S> extends true
    ? UnifiedHybridAttachmentType
    : UnifiedReferenceAttachmentType
  : UnifiedValueAttachmentType;

export const defineAttachment = <S extends z.ZodType>(
  attachmentType: UnifiedAttachmentTypeFromSchema<S> & { schema: S }
): UnifiedAttachmentTypeForRegistry<S> =>
  attachmentType as unknown as UnifiedAttachmentTypeForRegistry<S>;
