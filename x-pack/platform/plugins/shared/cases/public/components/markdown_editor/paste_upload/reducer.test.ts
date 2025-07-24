/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducer } from './reducer';
import {
  type UploadStartState,
  type UploadInProgressState,
  UploadPhase,
  ActionType,
} from './types';

describe('reducer', () => {
  const filename = 'foo.png';
  const placeholder = `<!-- uploading "${filename}" -->`;

  it('transitions from IDLE -> START_UPLOAD', () => {
    const state = reducer(
      { phase: UploadPhase.IDLE },
      {
        type: ActionType.START_UPLOAD,
        filename,
        placeholder,
      }
    );
    expect(state.phase).toBe(UploadPhase.START_UPLOAD);
    expect((state as UploadStartState).filename).toBe(filename);
  });

  it('transitions from START_UPLOAD -> UPLOADING', () => {
    const startState: UploadStartState = {
      phase: UploadPhase.START_UPLOAD,
      filename,
      placeholder,
    };
    const next = reducer(startState, {
      type: ActionType.UPLOAD_IN_PROGRESS,
      filename,
      placeholder,
    });
    expect(next.phase).toBe(UploadPhase.UPLOADING);
  });

  it('transitions to FINISHED and then RESET', () => {
    const uploading: UploadInProgressState = {
      phase: UploadPhase.UPLOADING,
      filename,
      placeholder,
    };
    const doneState = reducer(uploading, {
      type: ActionType.UPLOAD_FINISHED,
      // @ts-ignore partial for testing
      file: { id: '1', fileJSON: { name: filename, extension: 'png' } },
      placeholder,
    });
    expect(doneState.phase).toBe(UploadPhase.FINISHED);

    const reset = reducer(doneState, { type: ActionType.RESET });
    expect(reset.phase).toBe(UploadPhase.IDLE);
  });
});
