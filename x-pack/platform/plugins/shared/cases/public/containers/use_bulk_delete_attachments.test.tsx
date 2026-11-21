/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkDeleteAttachments } from './use_bulk_delete_attachments';
import { bulkDeleteAttachments } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/use_cases_toast');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useBulkDeleteAttachments', () => {
  const caseId = 'test-case-id';
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('deletes the attachments, names them in the toast, and refreshes', async () => {
    (bulkDeleteAttachments as jest.Mock).mockResolvedValue(undefined);
    const request = { ids: ['attachment-1', 'attachment-2'] };

    const { result } = renderHook(() => useBulkDeleteAttachments(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ request, countLabel: '2 files' });
    });

    await waitFor(() => expect(refreshCaseViewPage).toHaveBeenCalled());
    expect(bulkDeleteAttachments).toHaveBeenCalledWith({ caseId, request });
    expect(showSuccessToast).toHaveBeenCalledWith('Removed 2 files');
  });

  it('shows an error toast and refreshes on failure, since part of the ids may be removed', async () => {
    const error = new Error('Failed to delete attachments');
    (bulkDeleteAttachments as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useBulkDeleteAttachments(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ request: { ids: ['attachment-1'] }, countLabel: '1 attachment' });
    });

    await waitFor(() => expect(refreshCaseViewPage).toHaveBeenCalled());
    expect(showErrorToast).toHaveBeenCalledWith(error, { title: expect.any(String) });
  });
});
