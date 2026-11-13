/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { createUploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { deleteFileAttachments } from '../../../containers/api';
import { useFileTray } from './use_file_tray';

jest.mock('@kbn/shared-ux-file-context', () => ({
  useFilesContext: () => ({ client: { getFileKind: () => ({ id: 'securitySolution' }) } }),
}));
jest.mock('@kbn/shared-ux-file-upload/src/upload_state');
jest.mock('../../../containers/api', () => ({ deleteFileAttachments: jest.fn() }));

const createUploadStateMock = createUploadState as jest.Mock;
const deleteFileAttachmentsMock = deleteFileAttachments as jest.Mock;

const pdf = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });

const createFakeUploadState = () => {
  const files$ = new BehaviorSubject<FileState[]>([]);
  let isUploading = false;

  return {
    files$,
    setFiles: jest.fn((files: File[]) =>
      files$.next(files.map((file) => ({ file, status: 'idle' })))
    ),
    upload: jest.fn(() => {
      isUploading = true;
    }),
    hasFiles: jest.fn(() => files$.getValue().length > 0),
    isUploading: jest.fn(() => isUploading),
    abort: jest.fn(() => {
      isUploading = false;
    }),
    clear: jest.fn(() => files$.next([])),
    dispose: jest.fn(),
    finishUpload: (id: string) => {
      isUploading = false;
      files$.next([{ file: pdf, status: 'uploaded', id }]);
    },
  };
};

describe('useFileTray', () => {
  let uploadState: ReturnType<typeof createFakeUploadState>;

  beforeEach(() => {
    jest.clearAllMocks();
    uploadState = createFakeUploadState();
    createUploadStateMock.mockReturnValue(uploadState);
    deleteFileAttachmentsMock.mockResolvedValue(undefined);
  });

  const renderTray = () =>
    renderHook(() => useFileTray({ caseId: 'case-1', owner: 'securitySolution' }));

  it('uploads an added file with the case meta', () => {
    const { result } = renderTray();

    act(() => result.current.addFiles([pdf]));

    expect(uploadState.upload).toHaveBeenCalledWith({
      caseIds: ['case-1'],
      owner: ['securitySolution'],
    });
    expect(result.current.trayFile).toEqual(expect.objectContaining({ file: pdf, status: 'idle' }));
  });

  it('rejects more than 1 file per message', () => {
    const { result } = renderTray();

    act(() => result.current.addFiles([pdf, pdf]));

    expect(uploadState.upload).not.toHaveBeenCalled();
    expect(result.current.trayError).toBeTruthy();
  });

  it('rejects a second file while the tray holds one', () => {
    const { result } = renderTray();

    act(() => result.current.addFiles([pdf]));
    act(() => result.current.addFiles([pdf]));

    expect(uploadState.upload).toHaveBeenCalledTimes(1);
    expect(result.current.trayError).toBeTruthy();
  });

  it('deletes an uploaded file when it is removed', () => {
    const { result } = renderTray();

    act(() => result.current.addFiles([pdf]));
    act(() => uploadState.finishUpload('file-1'));
    act(() => result.current.removeFile());

    expect(deleteFileAttachmentsMock).toHaveBeenCalledWith({
      caseId: 'case-1',
      fileIds: ['file-1'],
    });
    expect(result.current.trayFile).toBeNull();
  });

  it('aborts an upload in progress when it is removed', () => {
    const { result } = renderTray();

    act(() => result.current.addFiles([pdf]));
    act(() => result.current.removeFile());

    expect(uploadState.abort).toHaveBeenCalled();
    expect(deleteFileAttachmentsMock).not.toHaveBeenCalled();
  });

  it('keeps the uploaded file after it is sent', () => {
    const { result, unmount } = renderTray();

    act(() => result.current.addFiles([pdf]));
    act(() => uploadState.finishUpload('file-1'));
    act(() => result.current.reset());
    unmount();

    expect(deleteFileAttachmentsMock).not.toHaveBeenCalled();
  });

  it('deletes an uploaded file that was never sent on unmount', () => {
    const { result, unmount } = renderTray();

    act(() => result.current.addFiles([pdf]));
    act(() => uploadState.finishUpload('file-1'));
    unmount();

    expect(deleteFileAttachmentsMock).toHaveBeenCalledWith({
      caseId: 'case-1',
      fileIds: ['file-1'],
    });
  });

  it('is disabled without a valid owner', () => {
    const { result } = renderHook(() => useFileTray({ caseId: 'case-1', owner: null }));

    expect(result.current.isEnabled).toBe(false);
  });
});
