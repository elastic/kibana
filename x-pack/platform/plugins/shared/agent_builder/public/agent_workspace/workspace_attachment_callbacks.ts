/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';

export interface WorkspaceAttachmentCallbacks {
  addAttachment: (attachment: AttachmentInput) => void;
}

let workspaceAttachmentCallbacks: WorkspaceAttachmentCallbacks | null = null;

export const registerWorkspaceAttachmentCallbacks = (
  callbacks: WorkspaceAttachmentCallbacks
): void => {
  workspaceAttachmentCallbacks = callbacks;
};

export const clearWorkspaceAttachmentCallbacks = (): void => {
  workspaceAttachmentCallbacks = null;
};

export const getWorkspaceAttachmentCallbacks = (): WorkspaceAttachmentCallbacks | null =>
  workspaceAttachmentCallbacks;
