/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoveAlertFromCase } from './use_remove_alert_from_case';
import * as api from './api';
import * as useGetCaseModule from './use_get_case';
import type { UseGetCase } from './use_get_case';

const mockShowErrorToast = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockRefreshCaseViewPage = jest.fn();

jest.mock('../common/use_cases_toast', () => ({
  useCasesToast: () => ({
    showErrorToast: mockShowErrorToast,
    showSuccessToast: mockShowSuccessToast,
  }),
}));

jest.mock('../components/case_view/use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => mockRefreshCaseViewPage,
}));

const alertAttachment = {
  id: '1',
  type: 'alert',
  alertId: ['alert-123'],
  createdAt: '2023-01-01T00:00:00Z',
  createdBy: { fullName: 'John Doe' },
  updatedAt: '2023-01-02T00:00:00Z',
  updatedBy: { fullName: 'Jane Doe' },
  pushedAt: null,
  pushedBy: null,
};

const caseData = {
  case: {
    comments: [alertAttachment],
  },
};

describe('useRemoveAlertFromCase', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    jest.spyOn(api, 'removeAlertFromComment').mockResolvedValue(Promise.resolve());
    mockShowErrorToast.mockClear();
    mockShowSuccessToast.mockClear();
    mockRefreshCaseViewPage.mockClear();
  });

  const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('shows error toast if alert attachment not found', async () => {
    jest
      .spyOn(useGetCaseModule, 'useGetCase')
      .mockReturnValue({ data: { case: { comments: [] } } } as unknown as UseGetCase);
    const { result } = renderHook(() => useRemoveAlertFromCase('case-1'), { wrapper });

    await act(async () => {
      result.current.mutate({ alertId: 'not-found', successToasterTitle: 'Removed!' });
    });

    expect(mockShowErrorToast).toHaveBeenCalled();
    expect(api.removeAlertFromComment).not.toHaveBeenCalled();
  });

  it('calls removeAlertFromComment with correct params and shows success toast', async () => {
    jest.spyOn(useGetCaseModule, 'useGetCase').mockReturnValue({ data: caseData } as UseGetCase);
    const { result } = renderHook(() => useRemoveAlertFromCase('case-1'), { wrapper });

    await act(async () => {
      result.current.mutate({ alertId: 'alert-123', successToasterTitle: 'Removed!' });
    });

    expect(api.removeAlertFromComment).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case-1',
        alertId: 'alert-123',
        alertAttachment: expect.objectContaining({
          alertId: ['alert-123'],
        }),
      })
    );
    await waitFor(() => expect(mockShowSuccessToast).toHaveBeenCalledWith('Removed!'));
    expect(mockRefreshCaseViewPage).toHaveBeenCalled();
  });

  it('shows error toast if removeAlertFromComment throws', async () => {
    jest.spyOn(useGetCaseModule, 'useGetCase').mockReturnValue({ data: caseData } as UseGetCase);

    (api.removeAlertFromComment as jest.Mock).mockRejectedValueOnce(new Error('API error'));
    const { result } = renderHook(() => useRemoveAlertFromCase('case-1'), { wrapper });

    await act(async () => {
      result.current.mutate({ alertId: 'alert-123', successToasterTitle: 'Removed!' });
    });

    await waitFor(() => expect(mockShowErrorToast).toHaveBeenCalled());
  });
});
