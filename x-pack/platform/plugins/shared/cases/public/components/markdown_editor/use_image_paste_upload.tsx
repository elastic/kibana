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
import { type FileKindBase } from '@kbn/files-plugin/common/types';
import { useUploadDone } from '../files/use_upload_done';
import type { MarkdownEditorRef } from './editor';
import {
  MAX_IMAGE_SIZE_MESSAGE,
  NO_SIMULTANEOUS_UPLOADS_MESSAGE,
  UNSUPPORTED_MIME_TYPE_MESSAGE,
} from './translations';

interface UseImagePasteUploadArgs {
  editorRef: React.ForwardedRef<MarkdownEditorRef | null>;
  field: FieldHook<string>;
  caseId?: string;
  owner: string;
  fileKindId: string;
  setErrors: React.Dispatch<React.SetStateAction<Array<string | Error>>>;
}

/**
 * Returns a placeholder string for the file that is being uploaded
 */
function generatePlaceholderCopy(filename: string, extension?: string) {
  return `<!-- uploading "${filename}${extension ? `.${extension}` : ''}" -->`;
}

/**
 * Returns a markdown link for the file with a link to the asset
 */
function generateMarkdownLink(
  filename: string,
  id: string,
  kind: FileKindBase,
  extension?: string
) {
  return `![${filename}${extension ? `.${extension}` : ''}](/api/files/files/${
    kind.id
  }/${id}/blob)`;
}

// 5MB
const MAX_IMAGE_SIZE = 1024 * 1024 * 5;

export function useImagePasteUpload({
  editorRef,
  field,
  caseId,
  owner,
  fileKindId,
  setErrors,
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
  const [uploadPlaceholder, setUploadPlaceholder] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<FileState | null>(null);
  const textarea =
    editorRef === null || typeof editorRef === 'function'
      ? null
      : editorRef.current?.textarea ?? null;

  const replacePlaceholder = useCallback(
    (file: DoneNotification) => {
      if (!textarea) return;

      const newText = textarea.value.replace(
        uploadPlaceholder ?? '',
        generateMarkdownLink(file.fileJSON.name, file.id, kind, file.fileJSON.extension)
      );
      field.setValue(newText);
    },
    [textarea, uploadPlaceholder, kind, field]
  );
  const onDone = useUploadDone({
    caseId,
    onSuccess: () => {
      setUploadingFile(null);
      setUploadPlaceholder(null);
    },
    onFailure: (err) => {
      setErrors((cur) => [...cur, err]);
      setUploadingFile(null);
      setIsUploading(false);
    },
  });

  useEffect(() => {
    const subscriptions: Subscription[] = [];
    if (!uploadState.done$.observed) {
      subscriptions.push(
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
        uploadState.error$.subscribe((err) => {
          setIsUploading(false);
          if (err) {
            setErrors((cur) => [...cur, err]);
          }
        }),
        uploadState.uploading$.subscribe((uploading) => setIsUploading(uploading))
      );
    }

    return () => {
      subscriptions.forEach((s) => s.unsubscribe?.());
    };
  }, [uploadState, replacePlaceholder, onDone, setErrors]);

  // Insert the temporary placeholder whilst the file is uploading
  useEffect(() => {
    if (
      !textarea ||
      uploadingFile === null ||
      uploadPlaceholder ||
      !caseId ||
      !uploadingFile.file
    ) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const placeholder = generatePlaceholderCopy(uploadingFile.file.name);
    const before = field.value.slice(0, selectionStart);
    const after = field.value.slice(selectionEnd);
    field.setValue(before + placeholder + after);
    setUploadPlaceholder(placeholder);
  }, [uploadingFile, uploadPlaceholder, textarea, field, caseId]);

  const pasteListenerRef = useRef<(e: ClipboardEvent) => void>();

  useEffect(() => {
    if (!textarea || !caseId) return;

    const handlePaste: (e: ClipboardEvent) => void = (e) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      if (items.length > 1) {
        setErrors([NO_SIMULTANEOUS_UPLOADS_MESSAGE]);
        return;
      }
      for (const item of items) {
        const file = item.getAsFile();
        if (file) {
          // don't modify textarea value when receiving files
          e.preventDefault();
          if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            setErrors([UNSUPPORTED_MIME_TYPE_MESSAGE]);
            return;
          }
          if (file.size > MAX_IMAGE_SIZE) {
            setErrors([MAX_IMAGE_SIZE_MESSAGE]);
            return;
          }
          uploadState.setFiles([file]);
          if (uploadState.hasFiles()) {
            setErrors([]);
            uploadState.upload({
              caseIds: [caseId],
              owner,
            });
          }
        }
      }
    };

    pasteListenerRef.current = handlePaste;
    textarea.addEventListener('paste', handlePaste);
    return () => {
      textarea.removeEventListener('paste', handlePaste);
    };
  }, [textarea, uploadState, caseId, owner, setErrors]);

  return { isUploading, uploadState };
}
