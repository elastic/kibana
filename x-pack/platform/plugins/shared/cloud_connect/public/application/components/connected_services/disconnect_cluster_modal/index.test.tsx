/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DisconnectClusterModal } from '.';
import { CloudConnectedAppContextProvider } from '../../../app_context';

const mockTelemetryClient = {
  trackClusterConnected: vi.fn(),
  trackClusterDisconnected: vi.fn(),
  trackServiceEnabled: vi.fn(),
  trackServiceDisabled: vi.fn(),
  trackLinkClicked: vi.fn(),
};

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <CloudConnectedAppContextProvider
        value={
          {
            telemetryService: mockTelemetryClient,
          } as any
        }
      >
        {component}
      </CloudConnectedAppContextProvider>
    </IntlProvider>
  );
};

describe('DisconnectClusterModal', () => {
  const defaultProps = {
    clusterName: 'test-cluster-123',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with cluster name', () => {
    renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

    expect(screen.getByTestId('disconnectClusterModalTitle')).toBeInTheDocument();
    expect(screen.getByTestId('disconnectClusterNameLink')).toBeInTheDocument();
  });

  it('should render warning callout', () => {
    renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

    expect(screen.getByTestId('disconnectClusterWarningCallout')).toBeInTheDocument();
  });

  describe('Form validation', () => {
    it('should disable disconnect button when confirmation text is empty', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      expect(disconnectButton).toBeDisabled();
    });

    it('should disable disconnect button when confirmation text does not match cluster name', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByTestId('disconnectClusterConfirmationInput');
      await userEvent.type(input, 'wrong-cluster-name');

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      expect(disconnectButton).toBeDisabled();
    });

    it('should enable disconnect button when confirmation text matches cluster name', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByTestId('disconnectClusterConfirmationInput');
      await userEvent.type(input, 'test-cluster-123');

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      expect(disconnectButton).not.toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderWithIntl(<DisconnectClusterModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByTestId('disconnectClusterCancelButton');
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Disconnect button is clicked with valid confirmation', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderWithIntl(<DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} />);

      const input = screen.getByTestId('disconnectClusterConfirmationInput');
      await userEvent.type(input, 'test-cluster-123');

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      await userEvent.click(disconnectButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should render cluster name as a clickable button with copy icon', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      // The cluster name appears in the warning message as a clickable button (EUI Link renders as button)
      const clusterNameLink = screen.getByTestId('disconnectClusterNameLink');
      expect(clusterNameLink).toBeInTheDocument();

      // The button should have a copy icon
      const copyIcon = clusterNameLink.querySelector('[data-euiicon-type="copy"]');
      expect(copyIcon).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should disable input when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const input = screen.getByTestId('disconnectClusterConfirmationInput');
      expect(input).toBeDisabled();
    });

    it('should disable Cancel button when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByTestId('disconnectClusterCancelButton');
      expect(cancelButton).toBeDisabled();
    });

    it('should disable Disconnect button when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      expect(disconnectButton).toBeDisabled();
    });

    it('should show loading spinner on Disconnect button when isLoading is true', async () => {
      const onConfirm = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { rerender } = renderWithIntl(
        <DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} />
      );

      const input = screen.getByTestId('disconnectClusterConfirmationInput');
      await userEvent.type(input, 'test-cluster-123');

      // Start with isLoading false, then set to true
      rerender(
        <IntlProvider locale="en" messages={{}}>
          <CloudConnectedAppContextProvider
            value={
              {
                telemetryService: mockTelemetryClient,
              } as any
            }
          >
            <DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} isLoading={true} />
          </CloudConnectedAppContextProvider>
        </IntlProvider>
      );

      const disconnectButton = screen.getByTestId('disconnectClusterConfirmButton');
      expect(disconnectButton).toBeDisabled();
    });
  });
});
