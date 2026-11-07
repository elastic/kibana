/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { CASE_LINK_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_ATTACHMENT_ID_LENGTH, MAX_OWNER_LENGTH } from '../../../../constants';

/**
 * Deliberately empty: a link never stores the other case's title or number, because the other
 * case may be restricted and a link's attachment is readable by everyone who can read this case.
 * Readers look the linked case up as the viewer.
 */
export const CaseLinkAttachmentMetadataSchema = lazySchema(() => z.object({}).strict());
export type CaseLinkAttachmentMetadata = z.infer<typeof CaseLinkAttachmentMetadataSchema>;

/** A reference from one case to another. `attachmentId` is the other case's id. */
export const CaseLinkAttachmentPayloadSchema = lazySchema(() =>
  z
    .object({
      type: z.literal(CASE_LINK_ATTACHMENT_TYPE),
      owner: z.string().max(MAX_OWNER_LENGTH),
      attachmentId: z.string().min(1).max(MAX_ATTACHMENT_ID_LENGTH),
      metadata: CaseLinkAttachmentMetadataSchema.optional(),
    })
    .strict()
);
export type CaseLinkAttachmentPayload = z.infer<typeof CaseLinkAttachmentPayloadSchema>;
