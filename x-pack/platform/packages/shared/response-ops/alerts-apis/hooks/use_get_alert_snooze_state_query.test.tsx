/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { Wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import * as api from '../apis/get_muted_alerts_instances_by_rule';
import { useGetAlertSnoozeStateQuery } from './use_get_alert_snooze_state_query';

jest.mock('../apis/get_muted_alerts_instances_by_rule');

// Wrap useQuery in a call-through mock so we can assert the `context` option it
// receives while the real query behaviour (api call, error toast) still runs.
jest.mock('@kbn/react-query', () => {
  const actual = jest.requireActual('@kbn/react-query');
  return { __esModule: true, ...actual, useQuery: jest.fn(actual.useQuery) };
});

const useQueryMock = useQuery as jest.Mock;

const ruleIds = ['a', 'b'];

// Provides both the default react-query context and AlertsQueryContext so the
// hook can resolve a QueryClient regardless of `skipAlertsQueryContext`.
const dualClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const DualContextWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={dualClient}>
    <QueryClientProvider client={dualClient} context={AlertsQueryContext}>
      {children}
    </QueryClientProvider>
  </QueryClientProvider>
);

describe('useGetAlertSnoozeStateQuery', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getAlertSnoozeStateByRule');

    renderHook(() => useGetAlertSnoozeStateQuery({ http, notifications, ruleIds }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ruleIds })));
  });

  it('does not call the api if the enabled option is false', async () => {
    const spy = jest.spyOn(api, 'getAlertSnoozeStateByRule');

    renderHook(
      () => useGetAlertSnoozeStateQuery({ http, notifications, ruleIds }, { enabled: false }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest
      .spyOn(api, 'getAlertSnoozeStateByRule')
      .mockRejectedValue(new Error('An error'));

    renderHook(() => useGetAlertSnoozeStateQuery({ http, notifications, ruleIds }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => expect(addErrorMock).toHaveBeenCalled());
  });

  it('runs against AlertsQueryContext by default', async () => {
    renderHook(() => useGetAlertSnoozeStateQuery({ http, notifications, ruleIds }), {
      wrapper: DualContextWrapper,
    });

    await waitFor(() =>
      expect(useQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({ context: AlertsQueryContext })
      )
    );
  });

  it('runs against the default context when skipAlertsQueryContext is true', async () => {
    renderHook(
      () =>
        useGetAlertSnoozeStateQuery({
          http,
          notifications,
          ruleIds,
          skipAlertsQueryContext: true,
        }),
      { wrapper: DualContextWrapper }
    );

    await waitFor(() =>
      expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({ context: undefined }))
    );
  });
});
