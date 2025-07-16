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
import { constructFileKindIdByOwner } from '../../../common/files';
import { type Owner } from '../../../common/constants/types';
import { OWNERS } from '../../../common/constants';

interface UseImagePasteUploadArgs {
  editorRef: React.ForwardedRef<MarkdownEditorRef | null>;
  field: FieldHook<string>;
  caseId: string;
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
export const markdownImage = (fileName: string, fileUrl: string, ext?: string) =>
  `![${fileName}${ext ? `.${ext}` : ''}](${fileUrl})`;

function getTextarea(editorRef: React.ForwardedRef<MarkdownEditorRef | null>) {
  if (!editorRef || typeof editorRef === 'function' || !editorRef.current) {
    return null;
  }
  return editorRef.current.textarea;
}

const validOwners = new Set<Owner>(OWNERS);
const isOwner = (o: string): o is Owner => validOwners.has(o as Owner);

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
      if (!isOwner(owner)) return;

      const newText = textarea.value.replace(
        uploadPlaceholder ?? '',
        markdownImage(
          file.fileJSON.name,
          client.getDownloadHref({
            id: file.id,
            fileKind: constructFileKindIdByOwner(owner),
          }),
          file.fileJSON.extension
        )
      );
      field.setValue(newText);
    },
    [textarea, uploadPlaceholder, field, client, owner]
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

  const handlePasteError = useCallback(
    (e: ClipboardEvent, msg: string, opts: { clearUpload: () => void }) => {
      opts.clearUpload();
      setErrors([msg]);
      e.preventDefault();
    },
    [setErrors]
  );
  /*
   * Keep the paste handler up-to-date with the latest props, but without
   * re-attaching the DOM listener. The ref swap happens synchronously in
   * layout effect which runs before the browser paints.
   */
  useLayoutEffect(() => {
    pasteHandlerRef.current = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const items = Array.from(clipboardItems)
        .map((item) => item?.getAsFile())
        .filter((item) => !!item);
      if (items.length === 0) return;
      // NOTE: In Firefox, there will always be only 1 or 0 items,
      // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1699743
      if (items.length > 1) {
        handlePasteError(e, NO_SIMULTANEOUS_UPLOADS_MESSAGE, {
          clearUpload: () => setUploadingFileName(null),
        });
        return;
      }

      const fileToUpload = items[0];
      if (!fileToUpload) {
        // this is a non-file paste, so bubble and clear errors
        setErrors([]);
        return;
      }

      // prevent the default paste behaviour (inserts base64 string, etc.)
      e.preventDefault();

      if (
        !SUPPORTED_PASTE_MIME_TYPES.includes(
          fileToUpload.type as (typeof SUPPORTED_PASTE_MIME_TYPES)[number]
        )
      ) {
        handlePasteError(e, UNSUPPORTED_MIME_TYPE_MESSAGE, {
          clearUpload: () => setUploadingFileName(null),
        });
        return;
      }

      try {
        uploadState.setFiles([fileToUpload]);
      } catch (err) {
        setErrors((prev) => (prev.includes(err) ? prev : [...prev, err]));
      }

      if (uploadState.hasFiles() && uploadState.uploading$.value === false && caseId) {
        setErrors([]);
        uploadState.upload({ caseIds: [caseId], owner });
      }
    };
  }, [caseId, owner, uploadState, setErrors, handlePasteError]);

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
