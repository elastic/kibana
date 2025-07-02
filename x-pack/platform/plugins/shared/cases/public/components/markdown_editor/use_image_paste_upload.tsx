/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subscription } from 'rxjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { DoneNotification, FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { createUploadState, type UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { useUploadDone } from '../files/use_upload_done';
import type { MarkdownEditorRef } from './editor';

interface UseImagePasteUploadArgs {
  editorRef: React.ForwardedRef<MarkdownEditorRef | null>;
  field: FieldHook<string>;
  caseId?: string;
  owner: string;
  fileKindId: string;
}

function getUploadPlaceholderCopy(filename: string) {
  return `<!-- uploading "${filename}" -->`;
}

export function useImagePasteUpload({
  editorRef,
  field,
  caseId,
  owner,
  fileKindId,
}: UseImagePasteUploadArgs): {
  isUploading: boolean;
  uploadState: UploadState;
} {
  const { client } = useFilesContext();
  const kind = client.getFileKind(fileKindId);

  const uploadState = useMemo(
    () =>
      createUploadState({
        client,
        fileKind: kind,
        allowRepeatedUploads: false,
      }),
    [client, kind]
  );

  const [isUploading, setIsUploading] = useState(false);
  const [placeholderInserted, setPlaceholderInserted] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<FileState | null>(null);
  const textarea =
    editorRef === null || typeof editorRef === 'function'
      ? null
      : editorRef.current?.textarea ?? null;

  const replacePlaceholder = useCallback(
    (file: DoneNotification) => {
      if (!textarea) return;
      const newText = textarea.value.replace(
        getUploadPlaceholderCopy(file.fileJSON.name),
        `![${file.fileJSON.name}](/api/files/files/${kind.id}/${file.id}/blob)`
      );
      field.setValue(newText);
    },
    [textarea, field, kind.id]
  );

  const onDone = useUploadDone({
    caseId,
    owner,
    onSuccess: () => {
      setUploadingFile(null);
      setPlaceholderInserted(false);
    },
    onFailure: () => {
      setUploadingFile(null);
      setIsUploading(false);
    },
  });

  useEffect(() => {
    const subs: Subscription[] = [];
    if (!uploadState.done$.observed) {
      subs.push(
        uploadState.files$.subscribe((files: FileState[]) => {
          if (files.length && files[0].status !== 'uploaded') setUploadingFile(files[0]);
        }),
        uploadState.done$.subscribe((files: DoneNotification[] | undefined) => {
          if (files?.length) {
            replacePlaceholder(files[0]);
          }
          setUploadingFile(null);
          onDone(files);
        }),
        uploadState.error$.subscribe(() => {
          setIsUploading(false);
        }),
        uploadState.uploading$.subscribe((uploading) => setIsUploading(uploading))
      );
    }

    return () => {
      subs.forEach((s) => s.unsubscribe?.());
    };
  }, [uploadState, replacePlaceholder, onDone]);

  // Insert the temporary placeholder whilst the file is uploading
  useEffect(() => {
    if (
      !textarea ||
      uploadingFile === null ||
      placeholderInserted ||
      !caseId ||
      !uploadingFile.fileJSON
    )
      return;

    const { selectionStart, selectionEnd } = textarea;
    const placeholder = getUploadPlaceholderCopy(uploadingFile.fileJSON.name);
    const before = field.value.slice(0, selectionStart);
    const after = field.value.slice(selectionEnd);
    field.setValue(before + placeholder + after);
    setPlaceholderInserted(true);
  }, [uploadingFile, placeholderInserted, textarea, field, caseId]);

  // Attach paste listener once the textarea is available
  const listenerRef = useRef<(e: ClipboardEvent) => void>();

  useEffect(() => {
    if (!textarea || !caseId) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        const file = item.getAsFile();
        if (file) {
          uploadState.setFiles([file]);
          if (uploadState.hasFiles()) {
            uploadState.upload({
              caseIds: [caseId],
              owner,
            });
          }
        }
      }
    };

    listenerRef.current = handlePaste;
    textarea.addEventListener('paste', handlePaste as EventListener);
    return () => {
      textarea.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [textarea, uploadState, caseId, owner]);

  return { isUploading, uploadState };
}
