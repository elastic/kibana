/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { OSQUERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

export const OsqueryAttachmentMetadataSchema = z
  .object({
    agentIds: z.array(z.string()),
    queryId: z.string(),
    scheduleId: z.string().optional(),
    executionCount: z.number().optional(),
    /**
     * Legacy duplicate of the top-level `attachmentId`. Kept optional so that
     * existing externalReference `osquery` SOs and clients still posting
     * `externalReferenceMetadata.actionId` continue to validate.
     */
    actionId: z.string().optional(),
  })
  .strict();

export const OsqueryAttachmentPayloadSchema = z
  .object({
    type: z.literal(OSQUERY_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string(),
    metadata: OsqueryAttachmentMetadataSchema,
  })
  .strict();

export type OsqueryAttachmentPayload = z.infer<typeof OsqueryAttachmentPayloadSchema>;
