/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
  connectorTypeDraftAttachmentDataSchema,
  type ConnectorTypeDraftAttachmentData,
} from '../../common/attachments';

export const createConnectorTypeDraftAttachmentType = (): AttachmentTypeDefinition<
  typeof CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
  ConnectorTypeDraftAttachmentData
> => ({
  id: CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parsed = connectorTypeDraftAttachmentDataSchema.safeParse(input);
    if (parsed.success) return { valid: true, data: parsed.data };
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: `Connector type draft for ${attachment.data.draft.displayName}. The user can open the prefilled builder and review it before saving.`,
    }),
  }),
  getAgentDescription: () =>
    'A `connector_type_draft` attachment holds a generated connector type definition. Render it with <render_attachment id="ATTACHMENT_ID" /> using an id returned by `draft_connector_type`. The user must review and save it in the builder.',
});
