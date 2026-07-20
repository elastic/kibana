/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';

// Mock the hooks that depend on Kibana context — keep the component under test
// isolated so we can drive its UI purely through controlled bindings.
jest.mock('./use_relay_app_bindings');
jest.mock('./use_relay_app_connection', () => ({
  useRelayAppConnection: () => ({
    isLoading: false,
    available: true,
    status: 'connected',
    error: undefined,
    isMutating: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  RELAY_APP_CONNECTION_STATUS_QUERY_KEY: ['relayAppConnectionStatus'],
}));

const mockUseRelayAppBindings = useRelayAppBindings as jest.MockedFunction<
  typeof useRelayAppBindings
>;
const mockUseBindChannel = useBindChannel as jest.MockedFunction<typeof useBindChannel>;
const mockUseUnbindChannel = useUnbindChannel as jest.MockedFunction<typeof useUnbindChannel>;

// AppsSection pulls the whole card + bindings together.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppsSection } = require('.');

const bindChannel = jest.fn().mockResolvedValue(undefined);
const unbindChannel = jest.fn().mockResolvedValue(undefined);

function makeBindings(bindings: SlackChannelBinding[]) {
  mockUseRelayAppBindings.mockReturnValue({ bindings, isLoading: false });
  mockUseBindChannel.mockReturnValue({ bind: bindChannel, isLoading: false });
  mockUseUnbindChannel.mockReturnValue({ unbind: unbindChannel, isLoading: false });
}

function setup(canEdit = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AppsSection canEdit={canEdit} />
      </QueryClientProvider>
    </I18nProvider>
  );
}

async function openChannels() {
  const btn = await screen.findByTestId('streamsSlackAppViewChannelsButton');
  fireEvent.click(btn);
}

describe('SlackConnectionBindings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a Bind button for a not_bound channel and calls bind on click', async () => {
    makeBindings([{ channel: 'C789', displayName: 'alerts', status: 'not_bound' }]);
    setup();
    await openChannels();

    const btn = await screen.findByTestId('streamsSlackAppBindChannelButton');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(bindChannel).toHaveBeenCalledWith('C789');
  });

  it('shows an Unbind button for a bound_to_self channel and opens a confirm modal', async () => {
    makeBindings([{ channel: 'C123', displayName: 'general', status: 'bound_to_self' }]);
    setup();
    await openChannels();

    const btn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    // Confirm modal should appear
    const modal = await screen.findByTestId('streamsSlackAppUnbindConfirmModal');
    expect(modal).toBeInTheDocument();

    // Confirming calls unbind — scope to the modal to avoid matching the list button
    const confirmBtn = within(modal).getByRole('button', { name: /^disconnect$/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(unbindChannel).toHaveBeenCalledWith('C123'));
  });

  it('cancel on the unbind confirm modal does not call unbind', async () => {
    makeBindings([{ channel: 'C123', displayName: 'general', status: 'bound_to_self' }]);
    setup();
    await openChannels();

    const btn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');
    fireEvent.click(btn);

    const modal = await screen.findByTestId('streamsSlackAppUnbindConfirmModal');
    expect(modal).toBeInTheDocument();

    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(unbindChannel).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('streamsSlackAppUnbindConfirmModal')).not.toBeInTheDocument()
    );
  });

  it('shows an Unavailable badge for a bound_to_other_target channel with no action button', async () => {
    makeBindings([{ channel: 'C456', displayName: 'alerts', status: 'bound_to_other_target' }]);
    setup();
    await openChannels();

    const badge = await screen.findByTestId('streamsSlackAppChannelUnavailableBadge');
    expect(badge).toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppBindChannelButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppUnbindChannelButton')).not.toBeInTheDocument();
  });

  it('disables Bind and Unbind buttons when canEdit is false', async () => {
    makeBindings([
      { channel: 'C789', displayName: 'alerts', status: 'not_bound' },
      { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
    ]);
    setup(false /* canEdit = false */);
    await openChannels();

    const bindBtn = await screen.findByTestId('streamsSlackAppBindChannelButton');
    const unbindBtn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');

    expect(bindBtn).toBeDisabled();
    expect(unbindBtn).toBeDisabled();
  });

  it('renders the correct Connected / Connectable counts', async () => {
    makeBindings([
      { channel: 'C001', displayName: 'general', status: 'bound_to_self' },
      { channel: 'C002', displayName: 'alerts', status: 'not_bound' },
      { channel: 'C003', displayName: 'random', status: 'not_bound' },
      { channel: 'C004', displayName: 'other', status: 'bound_to_other_target' },
    ]);
    setup();
    await openChannels();

    const counts = await screen.findByTestId('streamsSlackAppChannelCounts');
    expect(counts).toHaveTextContent('4 channels');
    expect(counts).toHaveTextContent('2 connectable');
  });

  it('filters the table rows by search text while keeping counts stable', async () => {
    makeBindings([
      { channel: 'C001', displayName: 'general', status: 'bound_to_self' },
      { channel: 'C002', displayName: 'alerts', status: 'not_bound' },
      { channel: 'C003', displayName: 'random', status: 'not_bound' },
    ]);
    setup();
    await openChannels();

    // All three channels visible initially
    expect(await screen.findByText('#general')).toBeInTheDocument();
    expect(screen.getByText('#alerts')).toBeInTheDocument();
    expect(screen.getByText('#random')).toBeInTheDocument();

    // Type a search term that matches only one channel
    const search = screen.getByTestId('streamsSlackAppChannelSearch');
    fireEvent.change(search, { target: { value: 'alert' } });

    await waitFor(() => {
      expect(screen.getByText('#alerts')).toBeInTheDocument();
      expect(screen.queryByText('#general')).not.toBeInTheDocument();
      expect(screen.queryByText('#random')).not.toBeInTheDocument();
    });

    // Counts remain unchanged (3 total, 2 connectable across all bindings)
    const counts = screen.getByTestId('streamsSlackAppChannelCounts');
    expect(counts).toHaveTextContent('3 channels');
    expect(counts).toHaveTextContent('2 connectable');
  });

  it('restores all rows when the search box is cleared', async () => {
    makeBindings([
      { channel: 'C001', displayName: 'general', status: 'bound_to_self' },
      { channel: 'C002', displayName: 'alerts', status: 'not_bound' },
    ]);
    setup();
    await openChannels();

    const search = await screen.findByTestId('streamsSlackAppChannelSearch');
    fireEvent.change(search, { target: { value: 'general' } });

    await waitFor(() => {
      expect(screen.queryByText('#alerts')).not.toBeInTheDocument();
    });

    // Clear the search
    fireEvent.change(search, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('#general')).toBeInTheDocument();
      expect(screen.getByText('#alerts')).toBeInTheDocument();
    });
  });
});
