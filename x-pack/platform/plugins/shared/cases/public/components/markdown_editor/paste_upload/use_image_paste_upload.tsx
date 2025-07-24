/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subscription } from 'rxjs';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useReducer } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { DoneNotification, FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { createUploadState, type UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import type { MarkdownEditorRef } from '../types';
import { NO_SIMULTANEOUS_UPLOADS_MESSAGE, UNSUPPORTED_MIME_TYPE_MESSAGE } from '../translations';
import { SUPPORTED_PASTE_MIME_TYPES } from '../constants';
import { constructFileKindIdByOwner } from '../../../../common/files';
import { type PasteUploadState, UploadPhase, ActionType } from './types';
import { reducer } from './reducer';
import { getTextarea, isOwner, markdownImage } from './utils';
import { useUploadStart } from './use_upload_start';
import { useUploadComplete } from './use_upload_complete';

interface UseImagePasteUploadArgs {
  editorRef: React.ForwardedRef<MarkdownEditorRef | null>;
  field: FieldHook<string>;
  caseId: string;
  owner: string;
  fileKindId: string;
  setErrors: React.Dispatch<React.SetStateAction<Array<string | Error>>>;
}

const DEFAULT_STATE: PasteUploadState = { phase: UploadPhase.IDLE };

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

  const [uiState, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const textarea = getTextarea(editorRef);

  /**
   * Subscribe to file upload API, and use responses to drive UI state.
   */
  useEffect(() => {
    const subs: Subscription[] = [
      uploadState.files$.subscribe((files: FileState[]) => {
        if (files.length && files[0].status !== 'uploaded' && uiState.phase === UploadPhase.IDLE) {
          dispatch({
            type: ActionType.START_UPLOAD,
            filename: files[0].file.name,
            placeholder: `<!-- uploading "${files[0].file.name}" -->`,
          });
        }
      }),
      uploadState.done$.subscribe((files) => {
        if (files?.length && uiState.phase === UploadPhase.UPLOADING) {
          dispatch({
            type: ActionType.UPLOAD_FINISHED,
            file: files[0],
            placeholder: uiState.placeholder,
          });
        } else {
          dispatch({ type: ActionType.RESET });
        }
      }),
      uploadState.error$.subscribe((err) => err && setErrors((c) => [...c, err])),
    ];
    return () => subs.forEach((s) => s.unsubscribe());
  }, [uploadState, setErrors, uiState]);

  const pasteHandlerRef = useRef<(e: ClipboardEvent) => void>();

  useUploadStart(uiState, dispatch, textarea, field);

  const replacePlaceholder = useCallback(
    (file: DoneNotification, placeholder: string) => {
      if (!textarea || !isOwner(owner)) return;
      const newText = textarea.value.replace(
        placeholder,
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
    [textarea, owner, client, field]
  );

  useUploadComplete(uiState, replacePlaceholder, dispatch);

  // sets error messages to display on the editor
  const handlePasteError = useCallback(
    (e: ClipboardEvent, msg: string) => {
      dispatch({ type: ActionType.RESET });
      setErrors([msg]);
      e.preventDefault();
    },
    [setErrors]
  );

  /**
   * This hook handles paste events and input errors.
   * It calls the files API to begin uploading accepted image files.
   */
  useLayoutEffect(() => {
    pasteHandlerRef.current = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const items = Array.from(clipboardItems)
        .map((item) => item?.getAsFile())
        .filter((item) => !!item);
      if (items.length === 0) {
        // Not a file paste – clear any previous errors and allow default behaviour.
        setErrors([]);
        return;
      }
      // NOTE: In Firefox, there will always be only 1 or 0 items,
      // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1699743
      if (items.length > 1) {
        handlePasteError(e, NO_SIMULTANEOUS_UPLOADS_MESSAGE);
        return;
      }

      const fileToUpload = items[0];
      if (!fileToUpload) {
        // this is a non-file paste, so bubble and clear errors
        setErrors([]);
        return;
      }

      if (
        !SUPPORTED_PASTE_MIME_TYPES.includes(
          fileToUpload.type as (typeof SUPPORTED_PASTE_MIME_TYPES)[number]
        )
      ) {
        handlePasteError(e, UNSUPPORTED_MIME_TYPE_MESSAGE);
        return;
      }

      // prevent the default paste behavior for supported image file pastes
      e.preventDefault();

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

  // Attach the listener once for the lifetime of the textarea element.
  useLayoutEffect(() => {
    if (!textarea) return;

    const delegatingListener = (e: ClipboardEvent) => pasteHandlerRef.current?.(e);

    textarea.addEventListener('paste', delegatingListener);
    return () => {
      textarea.removeEventListener('paste', delegatingListener);
    };
  }, [textarea]);

  return { isUploading: uiState.phase === UploadPhase.UPLOADING, uploadState };
}
