/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useBulkPostObservables } from './use_bulk_post_observables';
import { mockCase, mockObservables } from './mock';
import { useCasesToast } from '../common/use_cases_toast';
import type { CaseUI } from '../../common/ui/types';
import * as api from './api';
import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { ObservablePost } from '../../common/types/api';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../common/use_cases_toast');

const showErrorToast = jest.fn();
const showInfoToast = jest.fn();

describe('useBulkPostObservables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showInfoToast });
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkPostObservables');
    const { result } = renderHook(() => useBulkPostObservables(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId: mockCase.id, observables: mockObservables });
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ caseId: mockCase.id, observables: mockObservables })
    );
  });

  it('shows an info toast when the api call is successful and the maximum number of observables is reached', async () => {
    const manyObservables: ObservablePost[] = [];
    for (let i = 0; i < 100; i++) {
      manyObservables.push({
        typeKey: 'observable-type-ipv4',
        value: `192.168.1.${i}`,
        description: 'test',
      });
    }

    const spy = jest.spyOn(api, 'bulkPostObservables');
    spy.mockResolvedValue({
      observables: manyObservables.slice(0, MAX_OBSERVABLES_PER_CASE + 1),
    } as CaseUI);
    const { result } = renderHook(() => useBulkPostObservables(), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.mutate({ caseId: mockCase.id, observables: manyObservables });
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ caseId: mockCase.id, observables: manyObservables })
    );
    await waitFor(() => expect(showInfoToast).toHaveBeenCalled());
  });

  it('does not show an info toast when the api call is successful and the maximum number of observables is not reached', async () => {
    const { result } = renderHook(() => useBulkPostObservables(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId: mockCase.id, observables: mockObservables });
    });

    await waitFor(() => expect(showInfoToast).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'bulkPostObservables')
      .mockRejectedValue(new Error('useBulkPostObservables: Test error'));

    const { result } = renderHook(() => useBulkPostObservables(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseId: mockCase.id, observables: mockObservables });
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
