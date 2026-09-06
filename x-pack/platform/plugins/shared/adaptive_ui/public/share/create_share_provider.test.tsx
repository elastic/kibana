/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { sampleViewSpec } from '../../common/sample_view_spec';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { createAdaptiveUiShareProvider } from './create_share_provider';

const core = coreMock.createStart();
const provider = createAdaptiveUiShareProvider({ core, isDev: false });
const devProvider = createAdaptiveUiShareProvider({ core, isDev: true });

const attachment = (type: string, data: unknown): UnknownAttachment =>
  ({ id: 'attachment-1', type, data } as UnknownAttachment);

const renderProvider = (
  params: { attachment: UnknownAttachment; spec?: ViewSpec; isCanvas?: boolean },
  { isDev = false }: { isDev?: boolean } = {}
) => render(<>{(isDev ? devProvider : provider)({ isCanvas: false, ...params })}</>);

// Opening the popover kicks off connector discovery; tests that do not care
// about Slack still settle it so the state update lands inside `act`.
const settleConnectorLookup = () => waitFor(() => expect(core.http.get).toHaveBeenCalled());

describe('createAdaptiveUiShareProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    core.http.get.mockResolvedValue([]);
  });

  it('renders the menu from the spec the framework supplies', () => {
    renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });
    expect(screen.getByTestId('adaptiveUiShareButton')).not.toBeNull();
  });

  it('reads the spec from attachment data for its own view type', () => {
    renderProvider({ attachment: attachment(ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, sampleViewSpec) });
    expect(screen.getByTestId('adaptiveUiShareButton')).not.toBeNull();
  });

  it('declines an attachment with no spec', () => {
    renderProvider({ attachment: attachment('platform.sig_event', {}) });
    expect(screen.queryByTestId('adaptiveUiShareButton')).toBeNull();
  });

  it('declines its own view type when the stored data is not a valid spec', () => {
    renderProvider({ attachment: attachment(ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, { nope: true }) });
    expect(screen.queryByTestId('adaptiveUiShareButton')).toBeNull();
  });

  it('offers every download format', async () => {
    renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });

    fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));

    for (const id of ['png', 'text', 'markdown', 'html']) {
      expect(screen.getByTestId(`adaptiveUiShare-${id}`)).not.toBeNull();
    }

    await settleConnectorLookup();
  });

  it('groups the destinations under Download and Send headings', async () => {
    renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });

    fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));

    expect(screen.getByText('Download')).not.toBeNull();
    expect(screen.getByText('Send')).not.toBeNull();
    expect(screen.getByTestId('adaptiveUiShare-markdown').textContent).toBe('Markdown');
    expect(screen.getByTestId('adaptiveUiShare-slack').textContent).toBe('Slack');

    await settleConnectorLookup();
  });

  describe('Developer section', () => {
    const openMenuFor = (isDev: boolean) => {
      renderProvider(
        { attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec },
        { isDev }
      );
      fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));
    };

    it('is hidden outside a development instance', async () => {
      openMenuFor(false);

      expect(screen.queryByTestId('adaptiveUiShare-developer')).toBeNull();

      await settleConnectorLookup();
    });

    it('holds the payloads behind a nested panel on a development instance', async () => {
      openMenuFor(true);

      // The nested panel's contents stay out of the root menu.
      expect(screen.queryByTestId('adaptiveUiShare-viewspec')).toBeNull();

      fireEvent.click(screen.getByTestId('adaptiveUiShare-developer'));

      expect(screen.getByTestId('adaptiveUiShare-viewspec').textContent).toBe('ViewSpec');
      expect(screen.getByTestId('adaptiveUiShare-blockkit').textContent).toBe('Block Kit');
      expect(screen.queryByTestId('adaptiveUiShare-png')).toBeNull();

      await settleConnectorLookup();
    });

    it('returns to the root menu from the nested panel', async () => {
      openMenuFor(true);

      fireEvent.click(screen.getByTestId('adaptiveUiShare-developer'));
      fireEvent.click(screen.getByRole('button', { name: /Developer/ }));

      expect(screen.getByTestId('adaptiveUiShare-png')).not.toBeNull();
      expect(screen.queryByTestId('adaptiveUiShare-viewspec')).toBeNull();

      await settleConnectorLookup();
    });
  });

  it('rasterizes through the route for PNG', async () => {
    core.http.post.mockResolvedValue({
      response: { blob: async () => new Blob(['png'], { type: 'image/png' }) },
    });
    renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });

    fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));
    fireEvent.click(screen.getByTestId('adaptiveUiShare-png'));

    await waitFor(() =>
      expect(core.http.post).toHaveBeenCalledWith(
        '/internal/adaptive_ui/share/png',
        expect.objectContaining({ asResponse: true, rawResponse: true })
      )
    );
    await settleConnectorLookup();
  });

  describe('Slack destination', () => {
    const openMenu = () => {
      renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });
      fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));
    };

    it('stays disabled with a reason when no Slack connector is configured', async () => {
      core.http.get.mockResolvedValue([]);
      openMenu();

      await waitFor(() => expect(screen.getByTestId('adaptiveUiShare-slack')).toBeDisabled());
    });

    it('opens the channel picker when a Slack connector exists', async () => {
      core.http.get.mockResolvedValue([
        { id: 'slack-1', name: 'Ops Slack', connector_type_id: '.slack2' },
      ]);
      core.http.post.mockResolvedValue({ status: 'ok', data: { channels: [] } });
      openMenu();

      await waitFor(() => expect(screen.getByTestId('adaptiveUiShare-slack')).not.toBeDisabled());
      fireEvent.click(screen.getByTestId('adaptiveUiShare-slack'));

      expect(await screen.findByTestId('adaptiveUiSlackModal')).not.toBeNull();
    });

    it('treats a connector lookup failure as no connectors', async () => {
      core.http.get.mockRejectedValue(new Error('forbidden'));
      openMenu();

      await waitFor(() => expect(screen.getByTestId('adaptiveUiShare-slack')).toBeDisabled());
    });
  });

  it('surfaces a PNG failure as a toast', async () => {
    core.http.post.mockRejectedValue(new Error('boom'));
    renderProvider({ attachment: attachment('platform.sig_event', {}), spec: sampleViewSpec });

    fireEvent.click(screen.getByTestId('adaptiveUiShareButton'));
    fireEvent.click(screen.getByTestId('adaptiveUiShare-png'));

    await waitFor(() => expect(core.notifications.toasts.addError).toHaveBeenCalled());
    await settleConnectorLookup();
  });
});
