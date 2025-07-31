/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { Subscription } from 'rxjs';
import type { FileState, UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { type PasteUploadState, UploadPhase, ActionType, type Action } from './types';

const canUpload = (files: FileState[], uiState: PasteUploadState) => {
  return files.length && files[0].status !== 'uploaded' && uiState.phase === UploadPhase.IDLE;
};

export function useFileUploadApi(
  uploadState: UploadState,
  uiState: PasteUploadState,
  dispatch: Dispatch<Action>
) {
  useEffect(() => {
    const subs: Subscription[] = [
      uploadState.files$.subscribe((files: FileState[]) => {
        if (canUpload(files, uiState)) {
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
      uploadState.error$.subscribe(
        (err) => err && dispatch({ type: ActionType.UPLOAD_ERROR, errors: [err] })
      ),
    ];
    return () => subs.forEach((s) => s.unsubscribe());
  }, [uploadState, uiState, dispatch]);
}
