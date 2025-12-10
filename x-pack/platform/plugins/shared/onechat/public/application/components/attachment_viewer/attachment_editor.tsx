/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import type { AttachmentEditorProps as BaseEditorProps } from '@kbn/onechat-browser';
import { useOnechatServices } from '../../hooks/use_onechat_service';

export interface AttachmentEditorProps {
  /** The attachment being edited */
  attachment: VersionedAttachment;
  /** The version being edited */
  version: AttachmentVersion;
  /** Callback to save changes (creates new version) */
  onSave: (content: unknown) => Promise<void>;
  /** Callback to cancel editing */
  onCancel: () => void;
  /** Whether the editor is currently saving */
  isSaving?: boolean;
}

/**
 * Wrapper component for attachment editing.
 * Uses type-specific editors from the attachments service.
 * Manages edit state, dirty tracking, and save/cancel flow.
 */
export const AttachmentEditor: React.FC<AttachmentEditorProps> = ({
  attachment,
  version,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const { attachmentsService } = useOnechatServices();

  // Get the editor for this attachment type
  const RenderEditor = attachmentsService.getRenderEditor(attachment.type);

  // Track edited content and dirty state
  const [editedContent, setEditedContent] = useState<unknown>(version.data);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when version changes
  useEffect(() => {
    setEditedContent(version.data);
    setIsDirty(false);
    setError(null);
  }, [version]);

  // Handle content changes
  const handleChange = useCallback((newContent: unknown) => {
    setEditedContent(newContent);
    setIsDirty(true);
    setError(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await onSave(editedContent);
      setIsDirty(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : i18n.translate('xpack.onechat.attachmentEditor.saveError', {
              defaultMessage: 'Failed to save changes',
            })
      );
    }
  }, [editedContent, onSave]);

  // Handle cancel with dirty check
  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowConfirmCancel(true);
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  // Confirm cancel
  const handleConfirmCancel = useCallback(() => {
    setShowConfirmCancel(false);
    setIsDirty(false);
    setEditedContent(version.data);
    onCancel();
  }, [version.data, onCancel]);

  // If no editor available, show error
  if (!RenderEditor) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.onechat.attachmentEditor.notEditable', {
          defaultMessage: 'This attachment type cannot be edited',
        })}
        color="warning"
        iconType="warning"
      >
        {i18n.translate('xpack.onechat.attachmentEditor.notEditableDescription', {
          defaultMessage: 'The "{type}" attachment type does not support editing.',
          values: { type: attachment.type },
        })}
      </EuiCallOut>
    );
  }

  // Create fake attachment for editor
  const attachmentForEditor = {
    id: attachment.id,
    type: attachment.type,
    data: version.data,
    hidden: attachment.hidden,
  };

  // Create editor props
  const editorProps: BaseEditorProps = {
    attachment: attachmentForEditor,
    version,
    onChange: handleChange,
    onSave: handleSave,
    onCancel: handleCancel,
  };

  return (
    <EuiPanel paddingSize="m" hasBorder>
      {error && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.onechat.attachmentEditor.errorTitle', {
              defaultMessage: 'Error saving changes',
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
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          <RenderEditor {...editorProps} />

          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" style={{ marginTop: '16px' }}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={handleCancel} disabled={isSaving}>
                {i18n.translate('xpack.onechat.attachmentEditor.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleSave}
                fill
                disabled={!isDirty || isSaving}
                isLoading={isSaving}
              >
                {i18n.translate('xpack.onechat.attachmentEditor.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      {showConfirmCancel && (
        <EuiConfirmModal
          title={i18n.translate('xpack.onechat.attachmentEditor.confirmCancelTitle', {
            defaultMessage: 'Discard changes?',
          })}
          onCancel={() => setShowConfirmCancel(false)}
          onConfirm={handleConfirmCancel}
          cancelButtonText={i18n.translate('xpack.onechat.attachmentEditor.keepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('xpack.onechat.attachmentEditor.discardChanges', {
            defaultMessage: 'Discard changes',
          })}
          buttonColor="danger"
        >
          {i18n.translate('xpack.onechat.attachmentEditor.confirmCancelBody', {
            defaultMessage: 'You have unsaved changes. Are you sure you want to discard them?',
          })}
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};
