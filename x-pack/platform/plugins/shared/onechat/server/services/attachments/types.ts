/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, Attachment } from '@kbn/onechat-common/attachments';
import type {
  AttachmentRepresentation,
  AttachmentTypeDefinition,
} from '@kbn/onechat-server/attachments';
import type { ValidateAttachmentResult } from './validate_attachment';

export interface AttachmentServiceSetup {
  registerType(attachmentType: AttachmentTypeDefinition): void;
}

export interface AttachmentServiceStart {
  validate(attachment: AttachmentInput): Promise<ValidateAttachmentResult>;
  format(attachment: Attachment): Promise<AttachmentRepresentation>;
}
