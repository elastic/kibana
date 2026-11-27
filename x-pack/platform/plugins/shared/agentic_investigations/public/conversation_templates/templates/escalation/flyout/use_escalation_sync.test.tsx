/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { ESCALATION_SYNC_URL } from '../../../../../common';
import { useCanManageEscalations } from '../../../../escalations/hooks/use_escalation_privileges';
import { useEscalationSync } from './use_escalation_sync';

jest.mock('../../../../escalations/hooks/use_escalation_privileges', () => ({
  useCanManageEscalations: jest.fn(() => true),
}));

const renderSync = (post: jest.Mock) => {
  const core = coreMock.createStart();
  core.http.post = post;
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  const { result, rerender } = renderHook(() => useEscalationSync('esc-1'), { wrapper });
  return { core, result, rerender };
};

describe('useEscalationSync', () => {
  beforeEach(() => {
    jest.mocked(useCanManageEscalations).mockReturnValue(true);
  });

  it('shows a spinner while syncing and no toast when nothing changed', async () => {
    let resolve!: (value: { copied: number; failed: number }) => void;
    const post = jest.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const { core, result } = renderSync(post);

    await waitFor(() => expect(result.current).toBe(true));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(ESCALATION_SYNC_URL.replace('{id}', 'esc-1'));

    resolve({ copied: 0, failed: 0 });
    await waitFor(() => expect(result.current).toBe(false));
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a success toast when attachments were added', async () => {
    const { core } = renderSync(jest.fn().mockResolvedValue({ copied: 2, failed: 0 }));

    await waitFor(() => expect(core.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1));
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows an error toast when the request fails', async () => {
    const { core } = renderSync(jest.fn().mockRejectedValue(new Error('boom')));

    await waitFor(() =>
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'boom' })
      )
    );
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('shows an error toast when some attachments could not be copied', async () => {
    const { core } = renderSync(jest.fn().mockResolvedValue({ copied: 0, failed: 1 }));

    await waitFor(() => expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('syncs once per escalation, however often the flyout re-renders', async () => {
    const post = jest.fn().mockResolvedValue({ copied: 0, failed: 0 });
    const { result, rerender } = renderSync(post);

    await waitFor(() => expect(result.current).toBe(false));
    rerender();
    rerender();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not sync for a user who may not manage escalations', async () => {
    jest.mocked(useCanManageEscalations).mockReturnValue(false);
    const post = jest.fn().mockResolvedValue({ copied: 0, failed: 0 });
    const { result } = renderSync(post);

    expect(result.current).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});
