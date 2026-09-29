/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeleteObservable } from './use_delete_observables';
import { deleteObservable } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { TestProviders } from '../common/mock';

vi.mock('./api');
vi.mock('../common/use_cases_toast');
vi.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useDeleteObservable', () => {
  const caseId = 'test-case-id';
  const observableId = 'test-observable-id';
  const showErrorToast = vi.fn();
  const showSuccessToast = vi.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCasesToast as Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('should call deleteObservable and show success toast on success', async () => {
    (deleteObservable as Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteObservable(caseId, observableId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(deleteObservable).toHaveBeenCalledWith(caseId, observableId));
    expect(showSuccessToast).toHaveBeenCalledWith(expect.any(String));
    expect(refreshCaseViewPage).toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    const error = new Error('Failed to delete observable');
    (deleteObservable as Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteObservable(caseId, observableId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, { title: expect.any(String) })
    );
  });
});
