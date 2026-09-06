/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { sampleViewSpec } from '../../common/sample_view_spec';
import { SlackShareModal } from './slack_modal';
import { loadSlackChannels, postViewToSlack } from './slack_client';

jest.mock('./slack_client', () => ({
  loadSlackChannels: jest.fn(),
  postViewToSlack: jest.fn(),
}));

const mockLoadChannels = loadSlackChannels as jest.MockedFunction<typeof loadSlackChannels>;
const mockPost = postViewToSlack as jest.MockedFunction<typeof postViewToSlack>;

const core = coreMock.createStart();
const onClose = jest.fn();

const connectors = [{ id: 'slack-1', name: 'Ops Slack' }];

const renderModal = (overrides: Partial<React.ComponentProps<typeof SlackShareModal>> = {}) =>
  render(
    <SlackShareModal
      spec={sampleViewSpec}
      connectors={connectors}
      core={core}
      onClose={onClose}
      {...overrides}
    />
  );

describe('SlackShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadChannels.mockResolvedValue({
      channels: [
        { id: 'C1', name: 'general' },
        { id: 'C2', name: 'alerts' },
      ],
      truncated: false,
    });
  });

  it('lists the connector channels and posts the selected one', async () => {
    mockPost.mockResolvedValue({ ts: '1.2', blocks: 4 });
    renderModal();

    const channel = await screen.findByText('#alerts');
    fireEvent.click(channel);
    fireEvent.click(screen.getByTestId('adaptiveUiSlackSend'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(core.http, {
        connectorId: 'slack-1',
        channel: 'C2',
        spec: sampleViewSpec,
      })
    );
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps send disabled until a channel is picked', async () => {
    renderModal();
    await screen.findByText('#general');

    expect(screen.getByTestId('adaptiveUiSlackSend')).toBeDisabled();
  });

  it('filters the channel list in memory', async () => {
    renderModal();
    await screen.findByText('#general');

    fireEvent.change(screen.getByTestId('adaptiveUiSlackChannelFilter'), {
      target: { value: 'ale' },
    });

    expect(screen.getByText('#alerts')).not.toBeNull();
    expect(screen.queryByText('#general')).toBeNull();
  });

  it('surfaces a channel-loading failure', async () => {
    mockLoadChannels.mockRejectedValue(new Error('invalid_auth'));
    renderModal();

    expect(await screen.findByText('invalid_auth')).not.toBeNull();
  });

  it('reports a failed post as a toast and stays open', async () => {
    mockPost.mockRejectedValue(new Error('channel_not_found'));
    renderModal();

    fireEvent.click(await screen.findByText('#general'));
    fireEvent.click(screen.getByTestId('adaptiveUiSlackSend'));

    await waitFor(() => expect(core.notifications.toasts.addError).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers a connector selector only when more than one connector exists', async () => {
    const { unmount } = renderModal();
    await screen.findByText('#general');
    expect(screen.queryByTestId('adaptiveUiSlackConnectorSelect')).toBeNull();
    unmount();

    renderModal({ connectors: [...connectors, { id: 'slack-2', name: 'Eng Slack' }] });
    await screen.findByText('#general');
    expect(screen.getByTestId('adaptiveUiSlackConnectorSelect')).not.toBeNull();
  });

  it('warns when the channel list was truncated', async () => {
    mockLoadChannels.mockResolvedValue({
      channels: [{ id: 'C1', name: 'general' }],
      truncated: true,
    });
    renderModal();

    expect(
      await screen.findByText(/Showing the first channels the connector returned/)
    ).not.toBeNull();
  });
});
