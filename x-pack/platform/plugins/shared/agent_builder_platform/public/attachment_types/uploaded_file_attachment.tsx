/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0".
 */

import { i18n } from '@kbn/i18n';
import type { UploadedFileAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

export const uploadedFileAttachmentDefinition: AttachmentUIDefinition<{
  id: string;
  type: 'uploaded_file';
  data: UploadedFileAttachmentData;
}> = {
  getLabel: (attachment) =>
    attachment.data.name ||
    i18n.translate('xpack.agentBuilderPlatform.attachments.uploadedFile.label', {
      defaultMessage: 'Uploaded file',
    }),
  getIcon: () => 'document',
};
