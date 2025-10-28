/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnvalidatedAttachment, Attachment } from '@kbn/onechat-common/artifacts/attachments';
import type {
  AttachmentRepresentation,
  AttachmentTypeDefinition,
} from '@kbn/onechat-server/artifacts';
import type { ValidateAttachmentResult } from './validate_attachment';

export interface AttachmentServiceSetup {
  register(attachmentType: AttachmentTypeDefinition): void;
}
export interface AttachmentServiceStart {
  validate(attachment: UnvalidatedAttachment): Promise<ValidateAttachmentResult>;
  format(attachment: Attachment): Promise<AttachmentRepresentation>;
}
