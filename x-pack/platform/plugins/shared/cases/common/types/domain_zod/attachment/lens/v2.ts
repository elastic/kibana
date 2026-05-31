/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LENS_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/** `state` shape is owned by the lens plugin; kept permissive to round-trip what lens persists. */
export const LensAttachmentDataSchema = z.object({
  state: z.record(z.string(), z.unknown()),
});
export type LensAttachmentData = z.infer<typeof LensAttachmentDataSchema>;

export const LensAttachmentPayloadSchema = z
  .object({
    type: z.literal(LENS_ATTACHMENT_TYPE),
    owner: z.string(),
    data: LensAttachmentDataSchema,
  })
  .strict();

export type LensAttachmentPayload = z.infer<typeof LensAttachmentPayloadSchema>;
