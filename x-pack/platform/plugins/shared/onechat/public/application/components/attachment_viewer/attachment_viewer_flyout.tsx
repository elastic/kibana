/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiCallOut,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { getVersion } from '@kbn/onechat-common/attachments';
import { AttachmentViewerHeader } from './attachment_viewer_header';
import { AttachmentViewerContent } from './attachment_viewer_content';
import { AttachmentViewerFooter } from './attachment_viewer_footer';
import { useOnechatServices } from '../../hooks/use_onechat_service';

const modalStyles = css`
  max-width: 800px;
  min-height: 500px;
`;

export interface AttachmentViewerFlyoutProps {
  /** The attachment to view */
  attachment: VersionedAttachment;
  /** Initial version to display (defaults to current_version) */
  initialVersion?: number;
  /** Callback when flyout is closed */
  onClose: () => void;
  /** Callback when attachment is updated (creates new version). Returns updated attachment. */
  onUpdate?: (attachmentId: string, content: unknown, description?: string) => Promise<VersionedAttachment>;
  /** Callback when attachment is renamed (updates description without new version). Returns updated attachment. */
  onRename?: (attachmentId: string, description: string) => Promise<VersionedAttachment>;
}

/**
 * Flyout component for viewing and editing attachment content.
 * Supports version navigation and type-specific rendering.
 */
export const AttachmentViewerFlyout: React.FC<AttachmentViewerFlyoutProps> = ({
  attachment: initialAttachment,
  initialVersion,
  onClose,
  onUpdate,
  onRename,
}) => {
  const { attachmentsService } = useOnechatServices();

  // Local state for attachment - can be updated after save
  const [attachment, setAttachment] = useState(initialAttachment);

  // Version navigation state
  const [selectedVersion, setSelectedVersion] = useState(
    initialVersion ?? attachment.current_version
  );

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<unknown>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the current version data
  const currentVersionData = useMemo(() => {
    return getVersion(attachment, selectedVersion);
  }, [attachment, selectedVersion]);

  // Check if editing is supported
  const isEditable = useMemo(() => {
    return attachmentsService.isEditable(attachment.type);
  }, [attachmentsService, attachment.type]);

  // Version navigation
  const canGoBack = selectedVersion > 1;
  const canGoForward = selectedVersion < attachment.current_version;

  const goToPreviousVersion = useCallback(() => {
    if (canGoBack) {
      setSelectedVersion((v) => v - 1);
      setIsEditing(false);
    }
  }, [canGoBack]);

  const goToNextVersion = useCallback(() => {
    if (canGoForward) {
      setSelectedVersion((v) => v + 1);
      setIsEditing(false);
    }
  }, [canGoForward]);

  const handleVersionSelect = useCallback((version: number) => {
    setSelectedVersion(version);
    setIsEditing(false);
  }, []);

  // Edit handlers
  const handleStartEdit = useCallback(() => {
    if (currentVersionData && isEditable) {
      setEditedContent(currentVersionData.data);
      setIsEditing(true);
      setError(null);
    }
  }, [currentVersionData, isEditable]);

  const handleContentChange = useCallback((newContent: unknown) => {
    setEditedContent(newContent);
  }, []);

  const handleSave = useCallback(async () => {
    if (!onUpdate || editedContent === null) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedAttachment = await onUpdate(attachment.id, editedContent, attachment.description);
      // Update local attachment state with the new data
      setAttachment(updatedAttachment);
      // Move to the new version
      setSelectedVersion(updatedAttachment.current_version);
      setIsEditing(false);
      setEditedContent(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : i18n.translate('xpack.onechat.attachmentViewer.saveError', {
              defaultMessage: 'Failed to save attachment',
            })
      );
    } finally {
      setIsSaving(false);
    }
  }, [onUpdate, editedContent, attachment.id, attachment.description]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent(null);
    setError(null);
  }, []);

  // Handle rename (updates description without creating new version)
  const handleRename = useCallback(
    async (newDescription: string) => {
      if (!onRename) return;

      try {
        const updatedAttachment = await onRename(attachment.id, newDescription);
        // Update local attachment state with the new description
        setAttachment(updatedAttachment);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : i18n.translate('xpack.onechat.attachmentViewer.renameError', {
                defaultMessage: 'Failed to rename attachment',
              })
        );
        throw e; // Re-throw so the header can handle the error state
      }
    },
    [onRename, attachment.id]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isEditing) {
        onClose();
      } else if (event.key === 'ArrowLeft' && !isEditing) {
        goToPreviousVersion();
      } else if (event.key === 'ArrowRight' && !isEditing) {
        goToNextVersion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPreviousVersion, goToNextVersion, isEditing]);

  if (!currentVersionData) {
    return (
      <EuiModal onClose={onClose} css={modalStyles}>
        <EuiModalBody>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiCallOut
                title={i18n.translate('xpack.onechat.attachmentViewer.versionNotFound', {
                  defaultMessage: 'Version not found',
                })}
                color="warning"
                iconType="warning"
              >
                {i18n.translate('xpack.onechat.attachmentViewer.versionNotFoundDescription', {
                  defaultMessage: 'The requested version could not be found.',
                })}
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </EuiModal>
    );
  }

  return (
    <EuiModal
      onClose={onClose}
      css={modalStyles}
      aria-labelledby="attachmentViewerTitle"
      data-test-subj="attachmentViewerModal"
    >
      <EuiModalHeader>
        <AttachmentViewerHeader
          attachment={attachment}
          version={currentVersionData}
          onRename={onRename ? handleRename : undefined}
        />
      </EuiModalHeader>

      <EuiModalBody>
        {error && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.onechat.attachmentViewer.error', {
                defaultMessage: 'Error',
              })}
              color="danger"
              iconType="error"
              size="s"
            >
              {error}
            </EuiCallOut>
            <div style={{ marginBottom: '16px' }} />
          </>
        )}

        {isSaving ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '200px' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <AttachmentViewerContent
            attachment={attachment}
            version={currentVersionData}
            isEditing={isEditing}
            editedContent={editedContent}
            onContentChange={handleContentChange}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <AttachmentViewerFooter
          attachment={attachment}
          selectedVersion={selectedVersion}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onPreviousVersion={goToPreviousVersion}
          onNextVersion={goToNextVersion}
          onVersionSelect={handleVersionSelect}
          isEditable={isEditable && Boolean(onUpdate)}
          isEditing={isEditing}
          onEdit={handleStartEdit}
        />
      </EuiModalFooter>
    </EuiModal>
  );
};
