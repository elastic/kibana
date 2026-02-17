/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useBulkUpdateWorkflowStatus } from './use_bulk_update_workflow_status';
import { testQueryClientConfig } from '../utils/test';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
      {children}
    </QueryClientProvider>
  );
};

describe('useBulkUpdateWorkflowStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should call the API with correct parameters', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(() => useBulkUpdateWorkflowStatus({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      ids: ['alert-1', 'alert-2'],
      status: 'acknowledged',
      index: '.alerts-test',
    });

    await waitFor(() => expect(http.post).toHaveBeenCalled());

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/bulk_update', {
      body: JSON.stringify({
        ids: ['alert-1', 'alert-2'],
        status: 'acknowledged',
        index: '.alerts-test',
      }),
    });
  });

  it('should display success toast with "Alert acknowledged" when status is acknowledged', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(() => useBulkUpdateWorkflowStatus({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      ids: ['alert-1'],
      status: 'acknowledged',
      index: '.alerts-test',
    });

    await waitFor(() => expect(notifications.toasts.addSuccess).toHaveBeenCalled());

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith('Alert acknowledged');
  });

  it('should display success toast with "Alert unacknowledged" when status is open', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(() => useBulkUpdateWorkflowStatus({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      ids: ['alert-1'],
      status: 'open',
      index: '.alerts-test',
    });

    await waitFor(() => expect(notifications.toasts.addSuccess).toHaveBeenCalled());

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith('Alert unacknowledged');
  });

  it('should display error toast on failure', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useBulkUpdateWorkflowStatus({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      ids: ['alert-1'],
      status: 'acknowledged',
      index: '.alerts-test',
    });

    await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith('Error updating alert status');
  });
});
