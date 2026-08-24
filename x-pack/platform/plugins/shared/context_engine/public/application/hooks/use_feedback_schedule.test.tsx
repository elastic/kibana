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
import { getFeedbackSchedule, putFeedbackSchedule } from '../api/feedback_loop';
import { useFeedbackSchedule } from './use_feedback_schedule';

jest.mock('../api/feedback_loop', () => ({
  getFeedbackSchedule: jest.fn(),
  putFeedbackSchedule: jest.fn(),
}));

const mockGetFeedbackSchedule = jest.mocked(getFeedbackSchedule);
const mockPutFeedbackSchedule = jest.mocked(putFeedbackSchedule);

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const services = coreMock.createStart();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return { wrapper, services };
};

describe('useFeedbackSchedule', () => {
  beforeEach(() => {
    mockGetFeedbackSchedule.mockResolvedValue({ enabled: false });
    mockPutFeedbackSchedule.mockResolvedValue({ enabled: true, workflow_id: 'wf-1' });
  });

  afterEach(() => jest.clearAllMocks());

  it('reads the current schedule', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFeedbackSchedule({ aiIndexId: 'my-index' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetFeedbackSchedule).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ aiIndexId: 'my-index' })
    );
    expect(result.current.isEnabled).toBe(false);
  });

  it('does not read before the AI index is known', () => {
    const { wrapper } = setup();
    renderHook(() => useFeedbackSchedule({ aiIndexId: undefined }), { wrapper });

    expect(mockGetFeedbackSchedule).not.toHaveBeenCalled();
  });

  it('adopts the state the server confirmed instead of refetching', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFeedbackSchedule({ aiIndexId: 'my-index' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    result.current.setEnabled(true);

    await waitFor(() => expect(result.current.isEnabled).toBe(true));
    expect(mockPutFeedbackSchedule).toHaveBeenCalledWith(expect.anything(), {
      aiIndexId: 'my-index',
      enabled: true,
    });
    expect(mockGetFeedbackSchedule).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected change and leaves the switch where it was', async () => {
    mockPutFeedbackSchedule.mockRejectedValue(new Error('workflows unavailable'));
    const { wrapper, services } = setup();
    const { result } = renderHook(() => useFeedbackSchedule({ aiIndexId: 'my-index' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    result.current.setEnabled(true);

    await waitFor(() => expect(services.notifications.toasts.addError).toHaveBeenCalledTimes(1));
    expect(result.current.isEnabled).toBe(false);
  });
});
