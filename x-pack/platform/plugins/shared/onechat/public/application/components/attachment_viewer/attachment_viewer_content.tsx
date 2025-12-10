/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import type { AttachmentContentProps, AttachmentEditorProps } from '@kbn/onechat-browser';
import { useOnechatServices } from '../../hooks/use_onechat_service';

export interface AttachmentViewerContentProps {
  /** The attachment being viewed */
  attachment: VersionedAttachment;
  /** The specific version being viewed */
  version: AttachmentVersion;
  /** Whether the attachment is being edited */
  isEditing: boolean;
  /** The current edited content (when editing) */
  editedContent: unknown;
  /** Callback when content changes (when editing) */
  onContentChange: (newContent: unknown) => void;
  /** Callback to save changes */
  onSave: () => void;
  /** Callback to cancel editing */
  onCancel: () => void;
}

/**
 * Content component for the attachment viewer flyout.
 * Renders attachment content using type-specific renderers.
 * Switches between view and edit mode based on isEditing prop.
 */
export const AttachmentViewerContent: React.FC<AttachmentViewerContentProps> = ({
  attachment,
  version,
  isEditing,
  editedContent,
  onContentChange,
  onSave,
  onCancel,
}) => {
  const { attachmentsService } = useOnechatServices();

  // Get the appropriate renderer
  const RenderContent = useMemo(() => {
    return attachmentsService.getRenderContent(attachment.type);
  }, [attachmentsService, attachment.type]);

  const RenderEditor = useMemo(() => {
    return attachmentsService.getRenderEditor(attachment.type);
  }, [attachmentsService, attachment.type]);

  // Create the fake attachment object with the version data for rendering
  const attachmentForRender = useMemo(() => {
    return {
      id: attachment.id,
      type: attachment.type,
      data: version.data,
      hidden: attachment.hidden,
    };
  }, [attachment, version.data]);

  // Prepare props for content renderer
  const contentProps: AttachmentContentProps = useMemo(
    () => ({
      attachment: attachmentForRender,
      version,
    }),
    [attachmentForRender, version]
  );

  // Prepare props for editor renderer
  const editorProps: AttachmentEditorProps = useMemo(
    () => ({
      attachment: attachmentForRender,
      version,
      onChange: onContentChange,
      onSave,
      onCancel,
    }),
    [attachmentForRender, version, onContentChange, onSave, onCancel]
  );

  // Render edit mode if editing and editor is available
  if (isEditing && RenderEditor) {
    return (
      <EuiPanel paddingSize="none" hasShadow={false} data-test-subj="attachmentViewerEditor">
        <RenderEditor {...editorProps} />
      </EuiPanel>
    );
  }

  // Render view mode
  return (
    <EuiPanel paddingSize="none" hasShadow={false} data-test-subj="attachmentViewerContent">
      <RenderContent {...contentProps} />
    </EuiPanel>
  );
};
