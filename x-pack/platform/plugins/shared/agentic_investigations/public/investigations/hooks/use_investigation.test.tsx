/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  NIGHTSHIFT_PREVIEW_INVESTIGATION_ID,
  setNightshiftInvestigationDetailsPreview,
} from '@kbn/custom-content-renderer';
import { IN_PROGRESS_REFETCH_INTERVAL_MS, useInvestigation } from './use_investigation';

const renderUseInvestigation = (investigation: object, id = 'conv-1') => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue(investigation);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return { core, ...renderHook(() => useInvestigation(id), { wrapper }) };
};

describe('useInvestigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    setNightshiftInvestigationDetailsPreview(undefined);
    jest.useRealTimers();
  });

  it('reads the Nightshift preview investigation without requesting it, and does not poll', async () => {
    const investigation = { id: NIGHTSHIFT_PREVIEW_INVESTIGATION_ID, in_progress: true };
    setNightshiftInvestigationDetailsPreview({ conversation: {}, investigation });
    const { core, result } = renderUseInvestigation(
      { in_progress: false },
      NIGHTSHIFT_PREVIEW_INVESTIGATION_ID
    );

    await waitFor(() => expect(result.current.data).toBe(investigation));
    expect(core.http.get).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(IN_PROGRESS_REFETCH_INTERVAL_MS * 2);
    });
    expect(core.http.get).not.toHaveBeenCalled();
  });

  it.each([
    ['an idle', { in_progress: false, metadata: { status: 'open' } }],
    ['a closed', { in_progress: false, metadata: { status: 'closed' } }],
  ])(
    'reads %s investigation again while mounted, and stops once unmounted',
    async (_label, investigation) => {
      const { core, unmount } = renderUseInvestigation(investigation);
      await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(1));

      await act(async () => {
        jest.advanceTimersByTime(IN_PROGRESS_REFETCH_INTERVAL_MS);
      });
      await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(2));

      unmount();
      await act(async () => {
        jest.advanceTimersByTime(IN_PROGRESS_REFETCH_INTERVAL_MS * 2);
      });
      expect(core.http.get).toHaveBeenCalledTimes(2);
    }
  );
});
