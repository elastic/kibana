/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useRunDreaming } from './use_run_dreaming';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

type HttpError = IHttpFetchError<ResponseErrorBody>;

const createRunFailedHttpError = (): HttpError => {
  const body: ResponseErrorBody = { message: 'run failed', statusCode: 500 };
  return Object.assign(new Error('run failed'), {
    name: 'HttpFetchError',
    request: new Request('http://localhost'),
    body,
  });
};

const renderUseRunDreaming = (options: { onStarted?: jest.Mock } = {}) => {
  const core = coreMock.createStart();
  core.http.post.mockResolvedValue({
    executions: [
      {
        workflow_id: 'system-context-engine-dreaming-tickets-default',
        execution_id: 'exec-dream',
      },
    ],
    failed: [],
  });
  core.application.getUrlForApp.mockReturnValue('/app/workflows/exec');
  core.notifications.toasts.addSuccess = mockAddSuccess;
  core.notifications.toasts.addError = mockAddError;

  const queryClient = new QueryClient();
  jest.spyOn(queryClient, 'invalidateQueries');

  const { result } = renderHook(() => useRunDreaming(options), {
    wrapper: ({ children }) => (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
        </QueryClientProvider>
      </I18nProvider>
    ),
  });

  return { core, result, queryClient };
};

describe('useRunDreaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates the dreaming query when a run starts', async () => {
    const { core, result, queryClient } = renderUseRunDreaming();

    await act(async () => {
      result.current.runDreaming('tickets');
    });

    await waitFor(() => expect(core.http.post).toHaveBeenCalled());

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.dreaming('tickets'),
    });
  });

  it('reports started executions to the caller', async () => {
    const onStarted = jest.fn();
    const { result } = renderUseRunDreaming({ onStarted });

    await act(async () => {
      result.current.runDreaming('tickets');
    });

    await waitFor(() => expect(onStarted).toHaveBeenCalled());

    expect(onStarted).toHaveBeenCalledWith({
      executions: [
        {
          workflow_id: 'system-context-engine-dreaming-tickets-default',
          execution_id: 'exec-dream',
        },
      ],
      failed: [],
    });
  });

  it('shows a success toast with a view-execution link', async () => {
    const { result } = renderUseRunDreaming();

    await act(async () => {
      result.current.runDreaming('tickets');
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Dreaming run started',
        actionProps: expect.objectContaining({
          primary: expect.objectContaining({
            children: 'View execution',
            href: '/app/workflows/exec',
          }),
        }),
      })
    );
  });

  it('shows an error toast when the run fails', async () => {
    const core = coreMock.createStart();
    core.http.post.mockRejectedValue(createRunFailedHttpError());
    core.notifications.toasts.addError = mockAddError;

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useRunDreaming(), {
      wrapper: ({ children }) => (
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
          </QueryClientProvider>
        </I18nProvider>
      ),
    });

    await act(async () => {
      result.current.runDreaming('tickets');
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());

    expect(mockAddError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        title: 'Unable to run dreaming',
        toastMessage: 'run failed',
      })
    );
  });
});
