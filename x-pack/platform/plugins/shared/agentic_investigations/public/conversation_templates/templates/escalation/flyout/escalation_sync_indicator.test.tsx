/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { ESCALATION_SYNC_URL } from '../../../../../common';
import { EscalationSyncIndicator } from './escalation_sync_indicator';

const renderIndicator = (post: jest.Mock) => {
  const core = coreMock.createStart();
  core.http.post = post;
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>
        <EuiProvider>
          <I18nProvider>
            <EscalationSyncIndicator escalationId="esc-1" />
          </I18nProvider>
        </EuiProvider>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
  return core;
};

describe('EscalationSyncIndicator', () => {
  it('shows a spinner while syncing and no toast when nothing changed', async () => {
    let resolve!: (value: { copied: number; failed: number }) => void;
    const post = jest.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const core = renderIndicator(post);

    expect(await screen.findByTestId('escalationSyncSpinner')).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(ESCALATION_SYNC_URL.replace('{id}', 'esc-1'));

    resolve({ copied: 0, failed: 0 });
    await waitFor(() => expect(screen.queryByTestId('escalationSyncSpinner')).toBeNull());
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a success toast when attachments were added', async () => {
    const core = renderIndicator(jest.fn().mockResolvedValue({ copied: 2, failed: 0 }));

    await waitFor(() => expect(core.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1));
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows an error toast when the request fails', async () => {
    const core = renderIndicator(jest.fn().mockRejectedValue(new Error('boom')));

    await waitFor(() =>
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'boom' })
      )
    );
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('shows an error toast when some attachments could not be copied', async () => {
    const core = renderIndicator(jest.fn().mockResolvedValue({ copied: 0, failed: 1 }));

    await waitFor(() => expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
