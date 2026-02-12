/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';

export interface ListAttachmentsResponse {
  results: VersionedAttachment[];
  total_token_estimate: number;
}

export interface CreateAttachmentResponse {
  attachment: VersionedAttachment;
}

export interface UpdateAttachmentResponse {
  attachment: VersionedAttachment;
  new_version: number;
}

export interface DeleteAttachmentResponse {
  success: boolean;
  permanent: boolean;
}

export interface RestoreAttachmentResponse {
  success: boolean;
  attachment: VersionedAttachment;
}

export interface RenameAttachmentResponse {
  success: boolean;
  attachment: VersionedAttachment;
}
