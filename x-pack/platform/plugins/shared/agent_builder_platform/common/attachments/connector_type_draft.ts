/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { createConnectorTypeRequestSchema } from '@kbn/actions-plugin/common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export const CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE = 'connector_type_draft' as const;

export const connectorTypeDraftAttachmentDataSchema = lazySchema(() =>
  z.object({
    draft: createConnectorTypeRequestSchema,
    documentation_url: z.url().max(2048),
    logo_url: z.url().max(2048).optional(),
  })
);

export type ConnectorTypeDraftAttachmentData = z.infer<
  typeof connectorTypeDraftAttachmentDataSchema
>;

export type ConnectorTypeDraftAttachment = Attachment<
  typeof CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
  ConnectorTypeDraftAttachmentData
>;
