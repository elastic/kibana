/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import * as api from './api';
import { basicCaseId, basicFileMock } from './mock';
import { casesQueriesKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';
import { useDeleteFileAttachment } from './use_delete_file_attachment';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useDeleteFileAttachment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteFileAttachment with correct arguments - case', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      });
    });

    await waitFor(() =>
      expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
        caseId: basicCaseId,
        fileIds: [basicFileMock.id],
      })
    );
  });

  it('refreshes the case page view', async () => {
    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() => expect(useRefreshCaseViewPage()).toBeCalled());
  });

  it('shows a success toaster correctly', async () => {
    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'File deleted successfully',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('sets isError when fails to delete a file attachment', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');
    spyOnDeleteFileAttachments.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(spyOnDeleteFileAttachments).toBeCalledWith({
      caseId: basicCaseId,
      fileIds: [basicFileMock.id],
    });

    expect(addError).toHaveBeenCalled();
  });

  describe('optimistic file stats update', () => {
    const queryClient = createTestQueryClient();
    const statsKey = casesQueriesKeys.caseFileStats(basicCaseId, { searchTerm: undefined });

    const getWrapper =
      (qc: QueryClient): React.FC<{ children: React.ReactNode }> =>
      // eslint-disable-next-line react/display-name
      ({ children }) =>
        <TestProviders queryClient={qc}>{children}</TestProviders>;

    it('decrements the file stats count optimistically on mutate', async () => {
      queryClient.setQueryData(statsKey, { total: 3 });

      const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');
      let resolveDelete: () => void;
      spyOnDeleteFileAttachments.mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolveDelete = resolve))
      );

      const { result } = renderHook(() => useDeleteFileAttachment(), {
        wrapper: getWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({ caseId: basicCaseId, fileId: basicFileMock.id });
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(statsKey)).toEqual({ total: 2 });
      });

      await act(async () => resolveDelete!());
    });

    it('does not set file stats below zero', async () => {
      queryClient.setQueryData(statsKey, { total: 0 });

      let resolveDelete: () => void;
      jest
        .spyOn(api, 'deleteFileAttachments')
        .mockImplementationOnce(() => new Promise<void>((resolve) => (resolveDelete = resolve)));

      const { result } = renderHook(() => useDeleteFileAttachment(), {
        wrapper: getWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({ caseId: basicCaseId, fileId: basicFileMock.id });
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(statsKey)).toEqual({ total: 0 });
      });

      await act(async () => resolveDelete!());
    });

    it('rolls back file stats on error', async () => {
      jest.spyOn(api, 'deleteFileAttachments').mockRejectedValueOnce(new Error('Error'));

      queryClient.setQueryData(statsKey, { total: 5 });

      const { result } = renderHook(() => useDeleteFileAttachment(), {
        wrapper: getWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({ caseId: basicCaseId, fileId: basicFileMock.id });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(queryClient.getQueryData(statsKey)).toEqual({ total: 5 });
    });
  });
});
