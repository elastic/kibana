/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// All mocks must be defined BEFORE the hook is imported

import { renderHook, act } from '@testing-library/react';
import type { DoneNotification } from '@kbn/shared-ux-file-upload';

// Mock the deleteFileAttachments API -------------------------
const mockDeleteFileAttachments = jest.fn();
jest.mock('../../containers/api', () => ({
  deleteFileAttachments: (...args: unknown[]) => mockDeleteFileAttachments(...args),
}));

// Import the hook after mocks are in place -------------------
import { useUploadDone } from './use_upload_done';

// Utility factory to create a DoneNotification ---------------
// The overrides helper needs to allow callers to pass only the subset of
// fields they care about inside `fileJSON`. Declare a dedicated helper type
// to express that the top-level values are optional and the nested
// `fileJSON` object can itself be partial.
type DoneNotificationOverrides = Partial<Omit<DoneNotification, 'fileJSON'>> & {
  fileJSON?: Partial<DoneNotification['fileJSON']>;
};

const createDoneNotification = (overrides: DoneNotificationOverrides = {}): DoneNotification => {
  return {
    id: 'file-id',
    fileJSON: {
      name: 'myFile',
      extension: 'png',
      mimeType: 'image/png',
      ...('fileJSON' in overrides ? (overrides as unknown as DoneNotification).fileJSON : {}),
    },
    ...overrides,
  } as DoneNotification;
};

describe('useUploadDone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSuccess when the file contains extension & mimeType', async () => {
    const onSuccess = jest.fn();
    const onFailure = jest.fn();

    const { result } = renderHook(() =>
      useUploadDone({ caseId: 'case-123', onSuccess, onFailure })
    );

    const chosenFiles = [createDoneNotification()];

    await act(async () => {
      await result.current(chosenFiles);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onFailure).not.toHaveBeenCalled();
    expect(mockDeleteFileAttachments).not.toHaveBeenCalled();
  });

  it('calls onFailure and deletes attachment when extension or mimeType missing', async () => {
    const onSuccess = jest.fn();
    const onFailure = jest.fn();

    const { result } = renderHook(() =>
      useUploadDone({ caseId: 'case-123', onSuccess, onFailure })
    );

    const chosenFiles = [
      createDoneNotification({
        fileJSON: {
          name: 'badfile',
          extension: undefined as unknown as string | undefined,
          mimeType: undefined as unknown as string | undefined,
        },
      }),
    ];

    await act(async () => {
      await result.current(chosenFiles);
    });

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockDeleteFileAttachments).toHaveBeenCalledWith({
      caseId: 'case-123',
      fileIds: ['file-id'],
    });
  });

  it('calls onFailure when files are undefined or empty', async () => {
    const onSuccess = jest.fn();
    const onFailure = jest.fn();

    const { result } = renderHook(() =>
      useUploadDone({ caseId: 'case-123', onSuccess, onFailure })
    );

    await act(async () => {
      await result.current(undefined);
    });

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockDeleteFileAttachments).not.toHaveBeenCalled();
  });
});
