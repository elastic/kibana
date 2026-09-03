/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useInvestigateAlert } from './use_investigate_alert';
import { testQueryClientConfig } from '../utils/test';

const application = applicationServiceMock.createStartContract();
const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const startInvestigation = jest.fn();
let queryClient: QueryClient;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderInvestigateAlert = () =>
  renderHook(
    () =>
      useInvestigateAlert({
        alertId: 'alert-1',
        application,
        http,
        notifications,
        startInvestigation,
      }),
    { wrapper }
  );

describe('useInvestigateAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient(testQueryClientConfig);
    application.capabilities = {
      ...application.capabilities,
      agentBuilder: { write: true },
    };
    http.get.mockImplementation(async (request) => {
      const path = typeof request === 'string' ? request : request.path;
      return path.endsWith('/availability')
        ? { available: true }
        : { results: [], page: 1, size: 1, total: 0 };
    });
  });

  afterEach(() => queryClient.clear());

  it('returns Investigate when the alert has no investigation', async () => {
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));
    expect(result.current.investigateActionLabel).toBe('Investigate');
    expect(result.current.isInvestigating).toBe(false);
    expect(http.get).toHaveBeenCalledWith('/internal/nightshift/investigations', {
      query: {
        concurrency_key: 'alert-1',
        sort_field: 'created_at',
        sort_order: 'desc',
        size: 1,
      },
      signal: expect.any(AbortSignal),
    });
  });

  it('returns Investigating and disables starts for an ongoing investigation', async () => {
    http.get.mockImplementation(async (request) =>
      (typeof request === 'string' ? request : request.path).endsWith('/availability')
        ? { available: true }
        : { results: [{ status: 'running' }], page: 1, size: 1, total: 1 }
    );
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating'));
    expect(result.current.isInvestigating).toBe(true);
    await act(() => result.current.handleInvestigate());
    expect(startInvestigation).not.toHaveBeenCalled();
  });

  it('returns Re-investigate after a completed investigation', async () => {
    http.get.mockImplementation(async (request) =>
      (typeof request === 'string' ? request : request.path).endsWith('/availability')
        ? { available: true }
        : { results: [{ status: 'completed' }], page: 1, size: 1, total: 1 }
    );
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Re-investigate'));
    expect(result.current.isInvestigating).toBe(false);
  });

  it('starts and marks the investigation pending', async () => {
    startInvestigation.mockResolvedValue({ investigation_id: 'investigation-1' });
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(startInvestigation).toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Investigation started',
    });
    expect(result.current.investigateActionLabel).toBe('Investigating');
    expect(result.current.isInvestigating).toBe(true);
  });

  it('reports start failures', async () => {
    startInvestigation.mockRejectedValue(new Error('Request failed'));
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Failed to start investigation',
      text: 'Request failed',
    });
  });
});
