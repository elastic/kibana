/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType, type PasteUploadState, type Action, UploadPhase } from './types';

export const reducer = (state: PasteUploadState, action: Action): PasteUploadState => {
  switch (action.type) {
    case ActionType.RESET:
      return { phase: UploadPhase.IDLE };
    case ActionType.START_UPLOAD:
      return {
        phase: UploadPhase.START_UPLOAD,
        filename: action.filename,
        placeholder: action.placeholder,
      };
    case ActionType.UPLOAD_IN_PROGRESS:
      return {
        phase: UploadPhase.UPLOADING,
        filename: action.filename,
        placeholder: action.placeholder,
      };
    case ActionType.UPLOAD_FINISHED:
      return { phase: UploadPhase.FINISHED, file: action.file, placeholder: action.placeholder };
    case ActionType.UPLOAD_ERROR:
      return { phase: UploadPhase.ERROR, errors: action.errors };
    default:
      return state;
  }
};
