/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePatchObservable } from './use_patch_observables';
import { patchObservable } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import * as i18n from './translations';
import { TestProviders } from '../common/mock';

vi.mock('../common/use_cases_toast');
vi.mock('../components/case_view/use_on_refresh_case_view_page');

vi.mock('./api');
vi.mock('../common/lib/kibana');

describe('usePatchObservable', () => {
  const caseId = 'test-case-id';
  const observableId = 'test-observable-id';
  const showErrorToast = vi.fn();
  const showSuccessToast = vi.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const mockRequest = { observable: { value: 'value', typeKey: 'test', description: null } };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCasesToast as Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('should call patchObservable and show success toast on success', async () => {
    (patchObservable as Mock).mockResolvedValue({});

    const { result } = renderHook(() => usePatchObservable(caseId, observableId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(mockRequest);
    });

    await waitFor(() =>
      expect(patchObservable).toHaveBeenCalledWith(mockRequest, caseId, observableId)
    );
    expect(showSuccessToast).toHaveBeenCalledWith(i18n.OBSERVABLE_UPDATED);
    expect(refreshCaseViewPage).toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    const error = new Error('Failed to patch observable');
    (patchObservable as Mock).mockRejectedValue(error);

    const { result } = renderHook(() => usePatchObservable(caseId, observableId), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(mockRequest);
    });

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, { title: i18n.ERROR_TITLE })
    );
  });
});
