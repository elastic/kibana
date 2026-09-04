/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { InboundIngressCredentials } from './inbound_ingress_credentials';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';

describe('InboundIngressCredentials', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
  });

  it('shows the webhook URL and one-time ingest token', () => {
    Object.defineProperty(appMockRenderer.coreStart.http.basePath, 'publicBaseUrl', {
      value: 'https://kibana.example.com',
      configurable: true,
    });

    const connector = createMockActionConnector({
      id: 'sales-ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: { ingestToken: 'once-token' },
    });

    appMockRenderer.render(<InboundIngressCredentials connector={connector} />);

    expect(screen.getByTestId('inbound-ingress-webhook-url')).toHaveValue(
      'https://kibana.example.com/api/actions/events/.inboundWebhook/sales-ingress'
    );
    expect(screen.queryByTestId('inbound-ingress-public-base-url-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(screen.getByTestId('inbound-ingress-token-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-settings-label')).not.toBeInTheDocument();
  });

  it('warns and shows a relative webhook path when publicBaseUrl is not set', () => {
    const connector = createMockActionConnector({
      id: 'sales-ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: {},
    });

    appMockRenderer.render(<InboundIngressCredentials connector={connector} />);

    expect(screen.getByTestId('inbound-ingress-public-base-url-warning')).toBeInTheDocument();
    expect(screen.getByTestId('inbound-ingress-webhook-url')).toHaveValue(
      '/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });

  it('rotates the ingest token after confirmation', async () => {
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({
      ingest_token: 'rotated-token',
    });

    const connector = createMockActionConnector({
      id: 'sales-ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: {},
    });

    appMockRenderer.render(<InboundIngressCredentials connector={connector} allowRotate />);

    await userEvent.click(screen.getByTestId('inbound-ingress-rotate-btn'));
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(screen.getByTestId('inbound-ingress-ingest-token')).toHaveValue('rotated-token');
    });

    expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
      '/internal/actions/connector/sales-ingress/_rotate_event_token'
    );
  });
});
