/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { runFeedbackLoop } from '../api/feedback_loop';
import { contextEngineQueryKeys } from './query_keys';
import { useRunFeedbackLoop } from './use_run_feedback_loop';

jest.mock('../api/feedback_loop', () => ({ runFeedbackLoop: jest.fn() }));

const mockRunFeedbackLoop = jest.mocked(runFeedbackLoop);

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const services = coreMock.createStart();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return { wrapper, invalidateQueries, services };
};

describe('useRunFeedbackLoop', () => {
  beforeEach(() => {
    mockRunFeedbackLoop.mockResolvedValue({ execution_id: 'exec-1' });
  });

  afterEach(() => jest.clearAllMocks());

  it('starts a run and tells the user the suggestions come later', async () => {
    const { wrapper, invalidateQueries, services } = setup();
    const { result } = renderHook(() => useRunFeedbackLoop('my-index'), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRunFeedbackLoop).toHaveBeenCalledWith(expect.anything(), {
      aiIndexId: 'my-index',
    });
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.improvements.all('my-index'),
    });
  });

  it('reports a run that could not be started', async () => {
    mockRunFeedbackLoop.mockRejectedValue(new Error('workflows unavailable'));
    const { wrapper, services } = setup();
    const { result } = renderHook(() => useRunFeedbackLoop('my-index'), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(services.notifications.toasts.addError).toHaveBeenCalledTimes(1));
    expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
