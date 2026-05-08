/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DISCOVER_SESSION_ATTACHMENT_TYPE } from '../../../../constants/attachments';

export interface SavedObjectReferenceMetadata {
  title: string;
  soType: string;
}

/**
 * Reference-typed payload schemas for general saved-object attachments. Each payload
 * carries the SO id in `attachmentId`, and title plus `soType` in metadata
 */
const buildSavedObjectReferencePayloadSchema = <
  AttachmentType extends string,
  SoType extends string
>(
  attachmentType: AttachmentType,
  soType: SoType
) =>
  z
    .object({
      type: z.literal(attachmentType),
      owner: z.string(),
      attachmentId: z.string(),
      metadata: z
        .object({
          title: z.string(),
          soType: z.literal(soType),
        })
        .strict(),
    })
    .strict();

export const DiscoverSessionAttachmentPayloadSchema = buildSavedObjectReferencePayloadSchema(
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  'search'
);
export type DiscoverSessionAttachmentPayload = z.infer<
  typeof DiscoverSessionAttachmentPayloadSchema
>;
