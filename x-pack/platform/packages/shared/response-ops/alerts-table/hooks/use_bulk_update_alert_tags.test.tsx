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
import { useBulkUpdateAlertTags } from './use_bulk_update_alert_tags';
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

describe('useBulkUpdateAlertTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const onSuccess = jest.fn();
  const onError = jest.fn();

  it('should call the API with correct parameters when adding tags', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1', 'alert-2'],
      add: ['tag1', 'tag2'],
    });

    await waitFor(() => expect(http.post).toHaveBeenCalled());

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        index: '.alerts-test',
        alertIds: ['alert-1', 'alert-2'],
        add: ['tag1', 'tag2'],
      }),
    });
  });

  it('should call the API with correct parameters when removing tags', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1', 'alert-2'],
      remove: ['tag1', 'tag2'],
    });

    await waitFor(() => expect(http.post).toHaveBeenCalled());

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        index: '.alerts-test',
        alertIds: ['alert-1', 'alert-2'],
        remove: ['tag1', 'tag2'],
      }),
    });
  });

  it('should call the API with correct parameters when adding and removing tags', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1', 'alert-2', 'alert-3'],
      add: ['new-tag'],
      remove: ['old-tag'],
    });

    await waitFor(() => expect(http.post).toHaveBeenCalled());

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        index: '.alerts-test',
        alertIds: ['alert-1', 'alert-2', 'alert-3'],
        add: ['new-tag'],
        remove: ['old-tag'],
      }),
    });
  });

  it('should not include add/remove fields when they are undefined', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
    });

    await waitFor(() => expect(http.post).toHaveBeenCalled());

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        index: '.alerts-test',
        alertIds: ['alert-1'],
      }),
    });
  });

  it('should display success toast with alert message', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(notifications.toasts.addSuccess).toHaveBeenCalled());

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith('Updated tags for alert');
  });

  it('should call onSuccess callback on successful mutation', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should not call onSuccess callback when onSuccess is undefined', async () => {
    http.post.mockResolvedValue('success');

    const { result } = renderHook(() => useBulkUpdateAlertTags({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(notifications.toasts.addSuccess).toHaveBeenCalled());

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should display error toast with alert message on failure', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith('Failed to update tags for alert');
  });

  it('should call onError callback on failed mutation', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () => useBulkUpdateAlertTags({ http, notifications, onSuccess, onError }),
      { wrapper }
    );

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should not call onError callback when onError is undefined', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useBulkUpdateAlertTags({ http, notifications }), {
      wrapper,
    });

    result.current.mutate({
      index: '.alerts-test',
      alertIds: ['alert-1'],
      add: ['tag1'],
    });

    await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());

    expect(onError).not.toHaveBeenCalled();
  });
});
