/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useDeleteObservable } from './use_delete_observables';
import { deleteObservable } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('./api');
jest.mock('../common/use_cases_toast');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useDeleteObservable', () => {
  const caseId = 'test-case-id';
  const observableId = 'test-observable-id';
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('should call deleteObservable and show success toast on success', async () => {
    (deleteObservable as jest.Mock).mockResolvedValue({});

    const { result, waitFor } = renderHook(() => useDeleteObservable(caseId, observableId), {
      wrapper: appMockRender.AppWrapper,
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
    (deleteObservable as jest.Mock).mockRejectedValue(error);

    const { result, waitFor } = renderHook(() => useDeleteObservable(caseId, observableId), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, { title: expect.any(String) })
    );
  });
});
