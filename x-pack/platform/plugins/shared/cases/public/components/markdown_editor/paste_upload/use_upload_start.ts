/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { MarkdownValueControl } from '../types';
import { type PasteUploadState, type Action, UploadPhase, ActionType } from './types';

export function useUploadStart(
  state: PasteUploadState,
  dispatch: React.Dispatch<Action>,
  textarea: HTMLTextAreaElement | null,
  field: MarkdownValueControl
) {
  // Handle uploading state
  useEffect(() => {
    const { phase } = state;
    if (phase !== UploadPhase.START_UPLOAD || !textarea) return;
    const { filename, placeholder } = state;
    const { selectionStart, selectionEnd } = textarea;
    const before = field.value.slice(0, selectionStart);
    const after = field.value.slice(selectionEnd);
    field.setValue(before + placeholder + after);
    dispatch({
      type: ActionType.UPLOAD_IN_PROGRESS,
      filename,
      placeholder,
    });
  }, [state, textarea, field, dispatch]);
}
