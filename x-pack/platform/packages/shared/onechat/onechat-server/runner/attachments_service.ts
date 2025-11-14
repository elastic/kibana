/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentRepresentation } from '../attachments';

export interface AttachmentsService {
  format(attachment: AttachmentInput): Promise<AttachmentRepresentation>;
}
