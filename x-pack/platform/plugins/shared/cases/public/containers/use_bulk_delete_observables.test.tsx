/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkDeleteObservables } from './use_bulk_delete_observables';
import { bulkDeleteObservables } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useObservablesDeletedEBT } from '../analytics/observables';
import { TestProviders } from '../common/mock';
import { basicCase } from './mock';

jest.mock('./api');
jest.mock('../common/use_cases_toast');
jest.mock('../components/case_view/use_on_refresh_case_view_page');
jest.mock('../analytics/observables');

describe('useBulkDeleteObservables', () => {
  const caseId = 'test-case-id';
  const observableIds = ['observable-1', 'observable-2'];
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const reportObservablesDeleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
    (useObservablesDeletedEBT as jest.Mock).mockReturnValue(reportObservablesDeleted);
  });

  it('calls bulkDeleteObservables and shows a count-aware success toast on success', async () => {
    (bulkDeleteObservables as jest.Mock).mockResolvedValue(basicCase);

    const { result } = renderHook(() => useBulkDeleteObservables(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observableIds });
    });

    await waitFor(() => expect(bulkDeleteObservables).toHaveBeenCalledWith(caseId, observableIds));
    expect(showSuccessToast).toHaveBeenCalledWith(expect.any(String));
    expect(refreshCaseViewPage).toHaveBeenCalled();
  });

  it('reports the deletion event with bulk scope on success', async () => {
    (bulkDeleteObservables as jest.Mock).mockResolvedValue(basicCase);

    const { result } = renderHook(() => useBulkDeleteObservables(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observableIds });
    });

    await waitFor(() =>
      expect(reportObservablesDeleted).toHaveBeenCalledWith({ deleteScope: 'bulk' })
    );
    expect(reportObservablesDeleted).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast on failure', async () => {
    const error = new Error('Failed to bulk delete observables');
    (bulkDeleteObservables as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useBulkDeleteObservables(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observableIds });
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, { title: expect.any(String) })
    );
  });

  it('does not report the deletion event on failure', async () => {
    const error = new Error('Failed to bulk delete observables');
    (bulkDeleteObservables as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useBulkDeleteObservables(caseId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observableIds });
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
    expect(reportObservablesDeleted).not.toHaveBeenCalled();
  });
});
