/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import * as api from '../apis/mute_alert_instance';
import { useMuteAlertInstance } from './use_mute_alert_instance';

jest.mock('../apis/mute_alert_instance');

const params = { ruleId: '', alertInstanceId: '' };

// A default react-query context provider (no AlertsQueryContext), used to verify
// the hook resolves a QueryClient when skipAlertsQueryContext is true.
const DefaultContextWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useMuteAlertInstance', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'muteAlertInstance');

    const { result } = renderHook(() => useMuteAlertInstance({ http, notifications }), {
      wrapper: Wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith({
        id: params.ruleId,
        instanceId: params.alertInstanceId,
        http: expect.anything(),
      });
    });
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'muteAlertInstance').mockRejectedValue(new Error('An error'));

    const { result } = renderHook(() => useMuteAlertInstance({ http, notifications }), {
      wrapper: Wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });

  it('runs against the default context when skipAlertsQueryContext is true', async () => {
    const spy = jest.spyOn(api, 'muteAlertInstance');

    const { result } = renderHook(
      () => useMuteAlertInstance({ http, notifications, skipAlertsQueryContext: true }),
      { wrapper: DefaultContextWrapper }
    );

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
});
