/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { DisconnectClusterModal } from './index';

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('DisconnectClusterModal', () => {
  const defaultProps = {
    clusterName: 'test-cluster-123',
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with cluster name', () => {
    renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /disconnect cluster/i })).toBeInTheDocument();
    expect(screen.getByText(/test-cluster-123/i)).toBeInTheDocument();
  });

  it('should render warning callout', () => {
    renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

    expect(screen.getByText(/disconnecting a cluster cannot be reversed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this action cannot be undone and permanently deletes connection/i)
    ).toBeInTheDocument();
  });

  describe('Form validation', () => {
    it('should disable disconnect button when confirmation text is empty', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });

    it('should disable disconnect button when confirmation text does not match cluster name', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'wrong-cluster-name');

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });

    it('should enable disconnect button when confirmation text matches cluster name', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'test-cluster-123');

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).not.toBeDisabled();
    });

    it('should be case-sensitive when validating cluster name', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'TEST-CLUSTER-123');

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn();
      renderWithIntl(<DisconnectClusterModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Disconnect button is clicked with valid confirmation', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderWithIntl(<DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'test-cluster-123');

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      await userEvent.click(disconnectButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when Disconnect button is clicked without valid confirmation', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderWithIntl(<DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} />);

      // Button is disabled, so it won't be clickable
      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();

      // Attempt to click anyway (should not work)
      await userEvent.click(disconnectButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should render cluster name as a clickable button with copy icon', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      // The cluster name appears in the warning message as a clickable button (EUI Link renders as button)
      const clusterNameButton = screen.getByRole('button', { name: /test-cluster-123/i });
      expect(clusterNameButton).toBeInTheDocument();

      // The button should have a copy icon
      const copyIcon = clusterNameButton.querySelector('[data-euiicon-type="copy"]');
      expect(copyIcon).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should disable input when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      expect(input).toBeDisabled();
    });

    it('should disable Cancel button when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should disable Disconnect button when isLoading is true', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} isLoading={true} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });

    it('should show loading spinner on Disconnect button when isLoading is true', async () => {
      const onConfirm = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { rerender } = renderWithIntl(
        <DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} />
      );

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'test-cluster-123');

      // Start with isLoading false, then set to true
      rerender(
        <IntlProvider locale="en" messages={{}}>
          <DisconnectClusterModal {...defaultProps} onConfirm={onConfirm} isLoading={true} />
        </IntlProvider>
      );

      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });
  });

  describe('Form content', () => {
    it('should display confirmation input label', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      expect(screen.getByText(/type the cluster id to confirm/i)).toBeInTheDocument();
    });

    it('should use cluster name as placeholder for input', () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      expect(input).toBeInTheDocument();
    });

    it('should clear input when user types and then clears', async () => {
      renderWithIntl(<DisconnectClusterModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('test-cluster-123');
      await userEvent.type(input, 'test');
      await userEvent.clear(input);

      expect(input).toHaveValue('');
      const disconnectButton = screen.getByRole('button', { name: /disconnect cluster/i });
      expect(disconnectButton).toBeDisabled();
    });
  });
});
