/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import type {
  UnknownAttachment,
  AttachmentVersion,
  UpdateOriginResponse,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';

export enum ActionButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OVERFLOW = 'overflow',
}
/**
 * Props passed to custom attachment content renderers.
 */
export interface AttachmentRenderProps<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /** The attachment to render */
  attachment: TAttachment;
  /** Whether the attachment is being rendered in a sidebar context */
  isSidebar: boolean;
  /** Data from the screen context attachment, if present in the conversation */
  screenContext?: ScreenContextAttachmentData;
}

/**
 * Callbacks available to canvas content renderers.
 */
export interface CanvasRenderCallbacks {
  /** Register action buttons to display in the canvas header */
  registerActionButtons: (buttons: ActionButton[]) => void;
  /** Update the attachment's origin reference (e.g., after saving to library) */
  updateOrigin: (origin: unknown) => Promise<UpdateOriginResponse | undefined>;
  /** Close the canvas (expanded flyout view) */
  closeCanvas: () => void;
}

/**
 * Parameters passed when requesting action buttons for an inline-rendered attachment.
 */
export interface GetActionButtonsParams<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /** The attachment for which to provide action buttons */
  attachment: TAttachment;
  /** Whether the attachment is being rendered in a sidebar context */
  isSidebar: boolean;
  /** Whether the attachment is being rendered in canvas mode (expanded flyout view) */
  isCanvas: boolean;
  /** Function to update the attachment's origin reference */
  updateOrigin: (origin: unknown) => Promise<UpdateOriginResponse | undefined>;
  /** Callback to open the attachment in canvas mode (expanded flyout view). Undefined when already in canvas mode. */
  openCanvas?: () => void;
}

/**
 * Action button definition for inline-rendered attachments.
 */
export interface ActionButton {
  /** Button label text */
  label: string;
  /** Optional icon to display in the button (EUI icon name or custom React element) */
  icon?: IconType;
  /** Whether this is the primary action button */
  type: ActionButtonType;
  /** Handler function called when the button is clicked */
  handler: () => void | Promise<void>;
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
   * Optional custom click handler for attachment pills.
   * When provided, pills will invoke this instead of the default behavior.
   */
  onClick?: (args: { attachment: TAttachment; version?: AttachmentVersion }) => void;
  /**
   * Optional custom content renderer for inline attachment display.
   * When provided, attachments can be rendered inline in the conversation
   * using the <render_attachment> tag.
   */
  renderInlineContent?: (props: AttachmentRenderProps<TAttachment>) => ReactNode;
  /**
   * Optional custom content renderer for canvas mode (expanded flyout view).
   * When provided, attachments can be opened in an expanded view via action buttons.
   *
   * The `callbacks` object provides:
   * - `registerActionButtons`: dynamically register action buttons in the canvas header
   * - `updateOrigin`: link by-value attachments to persistent storage after saving
   */
  renderCanvasContent?: (
    props: AttachmentRenderProps<TAttachment>,
    callbacks: CanvasRenderCallbacks
  ) => ReactNode;
  /**
   * Optional function to provide action buttons for inline-rendered attachments.
   * Buttons will appear alongside or below the rendered content.
   */
  getActionButtons?: (params: GetActionButtonsParams<TAttachment>) => ActionButton[];
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
