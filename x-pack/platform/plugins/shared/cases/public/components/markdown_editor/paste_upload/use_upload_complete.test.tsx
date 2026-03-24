/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DoneNotification } from '@kbn/shared-ux-file-upload';
import { renderHook } from '@testing-library/react';
import { type UploadFinishedState, type UploadIdleState, UploadPhase, ActionType } from './types';
import { useUploadComplete } from './use_upload_complete';

describe('useUploadComplete', () => {
  const placeholder = '![Uploading image](uploading)';

  const file = {
    id: '1',
    fileJSON: { name: 'image', extension: 'png' },
  } as unknown as DoneNotification;

  it('replaces the placeholder and dispatches RESET when phase is FINISHED', () => {
    const state: UploadFinishedState = {
      phase: UploadPhase.FINISHED,
      file,
      placeholder,
    };

    const replacePlaceholder = jest.fn();
    const dispatch = jest.fn();

    renderHook(() => useUploadComplete(state, replacePlaceholder, dispatch));

    expect(replacePlaceholder).toHaveBeenCalledWith(file, placeholder);
    expect(dispatch).toHaveBeenCalledWith({ type: ActionType.RESET });
  });

  it('does nothing when phase is not FINISHED', () => {
    const state: UploadIdleState = { phase: UploadPhase.IDLE };
    const replacePlaceholder = jest.fn();
    const dispatch = jest.fn();

    renderHook(() => useUploadComplete(state, replacePlaceholder, dispatch));

    expect(replacePlaceholder).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
