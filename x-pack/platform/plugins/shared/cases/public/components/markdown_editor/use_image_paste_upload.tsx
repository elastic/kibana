/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subscription } from 'rxjs';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { DoneNotification, FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { createUploadState, type UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { useUploadDone } from '../files/use_upload_done';
import type { MarkdownEditorRef } from './types';
import { NO_SIMULTANEOUS_UPLOADS_MESSAGE, UNSUPPORTED_MIME_TYPE_MESSAGE } from './translations';
import { SUPPORTED_PASTE_MIME_TYPES } from './constants';

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

const IMAGE_PATH = (kindId: string, id: string) => `/api/files/files/${kindId}/${id}/blob`;

/**
 * Returns a markdown link for the file with a link to the asset
 */
export const markdownImage = (fileName: string, kindId: string, id: string, ext?: string) =>
  `![${fileName}${ext ? `.${ext}` : ''}](${IMAGE_PATH(kindId, id)})`;

function getTextarea(editorRef: React.ForwardedRef<MarkdownEditorRef | null>) {
  if (!editorRef || typeof editorRef === 'function' || !editorRef.current) {
    return null;
  }
  return editorRef.current.textarea;
}

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
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const textarea = getTextarea(editorRef);

  const replacePlaceholder = useCallback(
    (file: DoneNotification) => {
      if (!textarea) return;

      const newText = textarea.value.replace(
        uploadPlaceholder ?? '',
        markdownImage(file.fileJSON.name, kind.id, file.id, file.fileJSON.extension)
      );
      field.setValue(newText);
    },
    [textarea, uploadPlaceholder, kind, field]
  );
  const onDone = useUploadDone({
    caseId,
    onSuccess: () => {
      setUploadingFileName(null);
      setUploadPlaceholder(null);
    },
    onFailure: (err) => {
      setErrors((cur) => [...cur, err]);
      setUploadingFileName(null);
      setIsUploading(false);
    },
  });

  useEffect(() => {
    const subscriptions: Subscription[] = [];
    if (!uploadState.done$.observed) {
      subscriptions.push(
        uploadState.files$.subscribe((files: FileState[]) => {
          if (files.length && files[0].status !== 'uploaded') {
            setUploadingFileName(files[0].file.name);
          }
        }),
        uploadState.done$.subscribe((files: DoneNotification[] | undefined) => {
          if (files?.length) {
            replacePlaceholder(files[0]);
          }
          setUploadingFileName(null);
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
    if (!textarea || !uploadingFileName || uploadPlaceholder || !caseId) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const placeholder = generatePlaceholderCopy(uploadingFileName);
    const before = field.value.slice(0, selectionStart);
    const after = field.value.slice(selectionEnd);
    field.setValue(before + placeholder + after);
    setUploadPlaceholder(placeholder);
  }, [uploadingFileName, uploadPlaceholder, textarea, field, caseId]);

  const pasteHandlerRef = useRef<(e: ClipboardEvent) => void>();

  /*
   * Keep the paste handler up-to-date with the latest props, but without
   * re-attaching the DOM listener. The ref swap happens synchronously in
   * layout effect which runs before the browser paints.
   */
  useLayoutEffect(() => {
    pasteHandlerRef.current = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      if (items.length > 1) {
        setErrors([NO_SIMULTANEOUS_UPLOADS_MESSAGE]);
        return;
      }

      const file = items[0].getAsFile();
      if (!file) return;

      // prevent the default paste behaviour (inserts base64 string, etc.)
      e.preventDefault();

      if (
        !SUPPORTED_PASTE_MIME_TYPES.includes(
          file.type as (typeof SUPPORTED_PASTE_MIME_TYPES)[number]
        )
      ) {
        setErrors([UNSUPPORTED_MIME_TYPE_MESSAGE]);
        return;
      }

      try {
        uploadState.setFiles([file]);
      } catch (err) {
        setErrors((prev) => (prev.includes(err) ? prev : [...prev, err]));
      }

      if (uploadState.hasFiles() && uploadState.uploading$.value === false && caseId) {
        setErrors([]);
        uploadState.upload({ caseIds: [caseId], owner });
      }
    };
  }, [caseId, owner, uploadState, setErrors]);

  /*
   * Attach the listener once for the lifetime of the textarea element.
   * The delegating listener calls the mutable ref so it always has the
   * freshest logic without re-binding.
   */
  useLayoutEffect(() => {
    if (!textarea) return;

    const delegatingListener = (e: ClipboardEvent) => pasteHandlerRef.current?.(e);

    textarea.addEventListener('paste', delegatingListener);
    return () => {
      textarea.removeEventListener('paste', delegatingListener);
    };
  }, [textarea]);

  return { isUploading, uploadState };
}
