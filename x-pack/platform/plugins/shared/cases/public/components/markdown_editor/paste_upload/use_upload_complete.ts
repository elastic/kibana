/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { type DoneNotification } from '@kbn/shared-ux-file-upload';
import { type PasteUploadState, type Action, UploadPhase, ActionType } from './types';

export function useUploadComplete(
  state: PasteUploadState,
  replacePlaceholder: (file: DoneNotification, placeholder: string) => void,
  dispatch: React.Dispatch<Action>
) {
  useEffect(() => {
    const { phase } = state;
    if (phase !== UploadPhase.FINISHED) return;
    const { file, placeholder } = state;
    replacePlaceholder(file, placeholder);
    dispatch({ type: ActionType.RESET });
  }, [state, replacePlaceholder, dispatch]);
}
