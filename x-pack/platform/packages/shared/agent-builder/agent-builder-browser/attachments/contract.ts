/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { UnknownAttachment, AttachmentVersion } from '@kbn/agent-builder-common/attachments';

/**
 * UI definition for rendering attachments of a specific type.
 */
export interface AttachmentUIDefinition<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /**
   * Returns a human-readable label for the attachment.
   */
  getLabel: (attachment: TAttachment) => string;
  /**
   * Returns the icon type to display for the attachment.
   */
  getIcon?: () => IconType;
  /**
   * Optional custom click handler for attachment pills.
   * When provided, pills will invoke this instead of the default behavior.
   */
  onClick?: (args: { attachment: TAttachment; version?: AttachmentVersion }) => void;
}

/**
 * Public-facing contract for the attachment service.
 */
export interface AttachmentServiceStartContract {
  /**
   * Registers a UI definition for a specific attachment type.
   *
   * @param attachmentType - The unique identifier for the attachment type
   * @param definition - The UI definition for rendering this attachment type
   */
  addAttachmentType: <TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string,
    definition: AttachmentUIDefinition<TAttachment>
  ) => void;

  /**
   * Retrieves the UI definition for a specific attachment type.
   *
   * @param attachmentType - The type identifier to look up
   * @returns The UI definition if registered, undefined otherwise
   */
  getAttachmentUiDefinition: <TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string
  ) => AttachmentUIDefinition<TAttachment> | undefined;
}
