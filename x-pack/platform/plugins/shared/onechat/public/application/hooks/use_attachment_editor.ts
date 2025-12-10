/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo } from 'react';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from './use_onechat_service';

export interface UseAttachmentEditorOptions {
  /** The attachment being edited */
  attachment: VersionedAttachment;
  /** Callback when attachment is updated (called on save) */
  onUpdate?: (attachmentId: string, content: unknown, description?: string) => Promise<void>;
}

export interface UseAttachmentEditorReturn {
  /** Whether the attachment is currently in edit mode */
  isEditing: boolean;
  /** Start editing the attachment */
  startEditing: () => void;
  /** Stop editing (cancel) */
  stopEditing: () => void;
  /** The current edited content */
  editedContent: unknown | null;
  /** Update the edited content */
  setEditedContent: (content: unknown) => void;
  /** Whether the content has been modified */
  isDirty: boolean;
  /** Save the edited content */
  save: () => Promise<void>;
  /** Cancel editing and discard changes */
  cancel: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether this attachment type is editable */
  isEditable: boolean;
  /** Error message if save failed */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for managing attachment editing state.
 *
 * @example
 * ```tsx
 * const {
 *   isEditing,
 *   startEditing,
 *   editedContent,
 *   setEditedContent,
 *   save,
 *   cancel,
 *   isSaving
 * } = useAttachmentEditor({ attachment, onUpdate: handleUpdate });
 *
 * if (isEditing) {
 *   return <Editor value={editedContent} onChange={setEditedContent} />;
 * }
 * ```
 */
export function useAttachmentEditor({
  attachment,
  onUpdate,
}: UseAttachmentEditorOptions): UseAttachmentEditorReturn {
  const { attachmentsService } = useOnechatServices();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<unknown | null>(null);
  const [originalContent, setOriginalContent] = useState<unknown | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this type is editable
  const isEditable = useMemo(() => {
    return attachmentsService.isEditable(attachment.type);
  }, [attachmentsService, attachment.type]);

  // Start editing
  const startEditing = useCallback(() => {
    if (!isEditable) return;

    const latestVersion = attachment.versions.find(
      (v) => v.version === attachment.current_version
    );
    if (latestVersion) {
      setOriginalContent(latestVersion.data);
      setEditedContent(latestVersion.data);
      setIsEditing(true);
      setError(null);
    }
  }, [isEditable, attachment]);

  // Stop editing
  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setEditedContent(null);
    setOriginalContent(null);
    setError(null);
  }, []);

  // Check if content is dirty
  const isDirty = useMemo(() => {
    if (!isEditing || originalContent === null || editedContent === null) {
      return false;
    }
    // Simple JSON comparison for now
    return JSON.stringify(originalContent) !== JSON.stringify(editedContent);
  }, [isEditing, originalContent, editedContent]);

  // Save changes
  const save = useCallback(async () => {
    if (!onUpdate || editedContent === null || !isDirty) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onUpdate(attachment.id, editedContent, attachment.description);
      setIsEditing(false);
      setEditedContent(null);
      setOriginalContent(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save attachment');
    } finally {
      setIsSaving(false);
    }
  }, [onUpdate, editedContent, isDirty, attachment.id, attachment.description]);

  // Cancel editing
  const cancel = useCallback(() => {
    setIsEditing(false);
    setEditedContent(null);
    setOriginalContent(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isEditing,
    startEditing,
    stopEditing,
    editedContent,
    setEditedContent,
    isDirty,
    save,
    cancel,
    isSaving,
    isEditable,
    error,
    clearError,
  };
}
