/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { AttachmentsService } from './attachements_service';

export const createPublicAttachmentContract = ({
  attachmentsService,
}: {
  attachmentsService: AttachmentsService;
}): AttachmentServiceStartContract => {
  return {
    addAttachmentType: (attachmentType, definition) => {
      return attachmentsService.addAttachmentType(attachmentType, definition);
    },
    getAttachmentUiDefinition: (attachmentType) => {
      return attachmentsService.getAttachmentUiDefinition(attachmentType);
    },
  };
};
