/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  DocumentAttachmentData,
  UnknownAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

// Pending input attachments carry no data, only the origin and a description (the file name).
type DocumentAttachment = UnknownAttachment & { data?: Partial<DocumentAttachmentData> };

export const documentAttachmentDefinition: AttachmentUIDefinition<DocumentAttachment> = {
  getLabel: ({ data, description }) =>
    data?.name ??
    description ??
    i18n.translate('xpack.agentBuilderPlatform.attachments.document.label', {
      defaultMessage: 'Document',
    }),
  getIcon: () => 'document',
};
