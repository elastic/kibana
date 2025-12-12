/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type {
  FileState,
  DoneNotification,
  UploadState,
} from '@kbn/shared-ux-file-upload/src/upload_state';
import { BehaviorSubject } from 'rxjs';
import { useFileUploadApi } from './use_file_upload_api';
import { UploadPhase, ActionType, type PasteUploadState } from './types';

// Simplified mock UploadState implementation using BehaviorSubjects
const createMockUploadState = () => {
  const files$ = new BehaviorSubject<FileState[]>([]);
  const done$ = new BehaviorSubject<DoneNotification[]>([]);
  const error$ = new BehaviorSubject<Error | null>(null);

  // return object mimicking required interface
  return {
    files$,
    done$,
    error$,
    // helpers for tests
    emitFiles: (files: FileState[]) => files$.next(files),
    emitDone: (files: DoneNotification[]) => done$.next(files),
    setFiles: (files: FileState[]) => files$.next(files),
    emitError: (err: Error | null) => error$.next(err),
  } as unknown as UploadState;
};

/**
 * Generates a basic FileState-like object for tests
 */
const mockFileState = (status: 'uploading' | 'uploaded' = 'uploading'): FileState => ({
  status,
  file: new File([''], 'image.png', { type: 'image/png' }),
});

describe('useFileUploadApi', () => {
  it('dispatches START_UPLOAD when files$ emits while idle', () => {
    const uploadState = createMockUploadState();
    const dispatch = jest.fn();
    const uiState: PasteUploadState = { phase: UploadPhase.IDLE };

    renderHook(() => useFileUploadApi(uploadState, uiState, dispatch));

    // @ts-ignore partial implementation for testing
    uploadState.setFiles([mockFileState('uploading')]);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: ActionType.START_UPLOAD, filename: 'image.png' })
    );
  });

  it('dispatches UPLOAD_FINISHED when done$ emits during UPLOADING phase', () => {
    const uploadState = createMockUploadState();
    const dispatch = jest.fn();
    const uiState: PasteUploadState = {
      phase: UploadPhase.UPLOADING,
      placeholder: '<!-- uploading "image.png" -->',
      filename: 'image.png',
    };

    renderHook(() => useFileUploadApi(uploadState, uiState, dispatch));

    const doneNotification = {
      id: '1',
      kind: 'file',
      fileJSON: {
        name: 'image',
        extension: 'png',
        id: '1',
        created: new Date(),
        updated: new Date(),
        mimeType: 'image/png',
        size: 1024,
        meta: {},
        alt: '',
        fileKind: 'file',
        status: 'uploaded',
      },
    };

    // @ts-ignore partial implementation for testing
    uploadState.done$.next([doneNotification]);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: ActionType.UPLOAD_FINISHED, file: doneNotification })
    );
  });

  it('dispatches RESET when done$ emits but phase is not UPLOADING', () => {
    const uploadState = createMockUploadState();
    const dispatch = jest.fn();
    const uiState: PasteUploadState = { phase: UploadPhase.IDLE };

    renderHook(() => useFileUploadApi(uploadState, uiState, dispatch));

    uploadState.done$.next([
      // @ts-ignore partial implementation for testing
      { id: 'x', kind: 'file', fileJSON: { name: 'x', extension: 'png' } },
    ]);

    expect(dispatch).toHaveBeenCalledWith({ type: ActionType.RESET });
  });

  it('dispatches UPLOAD_ERROR when error$ emits', () => {
    const uploadState = createMockUploadState();
    const dispatch = jest.fn();
    const uiState: PasteUploadState = { phase: UploadPhase.IDLE };

    renderHook(() => useFileUploadApi(uploadState, uiState, dispatch));

    const err = new Error('boom');
    uploadState.error$.next(err);

    expect(dispatch).toHaveBeenCalledWith({ type: ActionType.UPLOAD_ERROR, errors: [err] });
  });

  it('unsubscribes from observables on unmount', () => {
    const uploadState = createMockUploadState();
    const dispatch = jest.fn();
    const uiState: PasteUploadState = { phase: UploadPhase.IDLE };

    const { unmount } = renderHook(() => useFileUploadApi(uploadState, uiState, dispatch));

    // Record how many times dispatch has been invoked during mount (could be >0)
    const initialCalls = dispatch.mock.calls.length;

    // Unmount hook so subscriptions are cleaned up
    unmount();

    // Emit after unmount – should not increase call count
    // @ts-ignore partial implementation for testing
    uploadState.setFiles([mockFileState('uploading')]);
    uploadState.error$.next(new Error('later'));
    uploadState.done$.next([
      // @ts-ignore partial implementation for testing
      { id: 'z', fileJSON: { name: 'z', extension: 'png' } },
    ]);

    expect(dispatch.mock.calls.length).toBe(initialCalls);
  });
});
