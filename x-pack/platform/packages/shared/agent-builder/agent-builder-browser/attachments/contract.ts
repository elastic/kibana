/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { ReactNode } from 'react';
import type { UnknownAttachment, AttachmentVersion } from '@kbn/agent-builder-common/attachments';

/**
 * Props passed to attachment content renderers (view mode).
 */
export interface AttachmentContentProps<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /** The attachment being rendered */
  attachment: TAttachment;
  /** The specific version being rendered */
  version: AttachmentVersion;
}

/**
 * Props passed to attachment editor renderers (edit mode).
 */
export interface AttachmentEditorProps<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /** The attachment being edited */
  attachment: TAttachment;
  /** The version being edited */
  version: AttachmentVersion;
  /** Callback when content changes */
  onChange: (newContent: unknown) => void;
  /** Callback to save changes (creates new version) */
  onSave: () => void;
  /** Callback to cancel editing */
  onCancel: () => void;
}

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
   * Renders the attachment content in view mode.
   * If not provided, a default JSON renderer will be used by consumers.
   */
  renderContent?: (props: AttachmentContentProps<TAttachment>) => ReactNode;
  /**
   * Renders the attachment editor in edit mode.
   * If not provided, the attachment type is not editable.
   */
  renderEditor?: (props: AttachmentEditorProps<TAttachment>) => ReactNode;
  /**
   * Whether this attachment type supports editing.
   * Defaults to false if renderEditor is not provided.
   */
  isEditable?: boolean;
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
