/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { renderHook } from '@testing-library/react';
import { useUploadStart } from './use_upload_start';
import { type UploadStartState, type UploadIdleState, UploadPhase, ActionType } from './types';

describe('useUploadStart', () => {
  const placeholder = '![Uploading image](uploading)';

  it('inserts the placeholder at the current cursor position and dispatches UPLOAD_IN_PROGRESS', () => {
    const filename = 'image.png';

    // Mock textarea selection so that the cursor is after "hello "
    const textarea = {
      selectionStart: 6,
      selectionEnd: 6,
    } as unknown as HTMLTextAreaElement;

    // Stub out the field hook with an initial value and a jest mock for setValue
    const fieldValue = 'hello world';
    const setValue = jest.fn();
    const field = {
      value: fieldValue,
      setValue,
    } as unknown as FieldHook<string>;

    // Build the initial state representing START_UPLOAD
    const state: UploadStartState = {
      phase: UploadPhase.START_UPLOAD,
      filename,
      placeholder,
    };

    // Spy dispatch function
    const dispatch = jest.fn();

    renderHook(() => useUploadStart(state, dispatch, textarea, field));

    // Expect placeholder inserted between "hello " and "world"
    expect(setValue).toHaveBeenCalledWith(`hello ${placeholder}world`);
    expect(dispatch).toHaveBeenCalledWith({
      type: ActionType.UPLOAD_IN_PROGRESS,
      filename,
      placeholder,
    });
  });

  it('does nothing when phase is not START_UPLOAD', () => {
    const textarea = {
      selectionStart: 0,
      selectionEnd: 0,
    } as unknown as HTMLTextAreaElement;

    const setValue = jest.fn();
    const field = {
      value: 'text',
      setValue,
    } as unknown as FieldHook<string>;

    const state: UploadIdleState = { phase: UploadPhase.IDLE };
    const dispatch = jest.fn();

    renderHook(() => useUploadStart(state, dispatch, textarea, field));

    expect(setValue).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
