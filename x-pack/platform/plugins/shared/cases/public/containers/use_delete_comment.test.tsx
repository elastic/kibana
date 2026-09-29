/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, waitFor, renderHook } from '@testing-library/react';
import { useDeleteComment } from './use_delete_comment';
import * as api from './api';
import { basicCaseId } from './mock';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';

vi.mock('../common/lib/kibana');
vi.mock('./api');
vi.mock('../components/case_view/use_on_refresh_case_view_page');

const commentId = 'ab124';
const successToasterTitle = 'Deleted';

describe('useDeleteComment', () => {
  const addSuccess = vi.fn();
  const addError = vi.fn();

  (useToasts as Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: TestProviders,
    });

    expect(result.current).toBeTruthy();
  });

  it('calls deleteComment with correct arguments - case', async () => {
    const spyOnDeleteComment = vi.spyOn(api, 'deleteComment');

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() =>
      expect(spyOnDeleteComment).toHaveBeenCalledWith({
        caseId: basicCaseId,
        commentId,
      })
    );
  });

  it('refreshes the case page view after delete', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() => expect(useRefreshCaseViewPage()).toHaveBeenCalled());
  });

  it('shows a success toaster correctly', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Deleted',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('sets isError when fails to delete a case', async () => {
    const spyOnDeleteComment = vi.spyOn(api, 'deleteComment');
    spyOnDeleteComment.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() => {
      expect(spyOnDeleteComment).toHaveBeenCalledWith({
        caseId: basicCaseId,
        commentId,
      });
    });

    expect(addError).toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});
