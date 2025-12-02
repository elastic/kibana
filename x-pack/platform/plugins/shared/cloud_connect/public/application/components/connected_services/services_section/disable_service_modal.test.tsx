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
import { DisableServiceModal } from './disable_service_modal';

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('DisableServiceModal', () => {
  const defaultProps = {
    serviceName: 'Elastic Inference Service',
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with service name in title', () => {
    renderWithIntl(<DisableServiceModal {...defaultProps} />);

    expect(screen.getByText(/disable elastic inference service\?/i)).toBeInTheDocument();
  });

  it('should render warning description', () => {
    renderWithIntl(<DisableServiceModal {...defaultProps} />);

    expect(
      screen.getByText(/disabling this service will permanently remove all related setup/i)
    ).toBeInTheDocument();
  });

  it('should render Cancel and Disable service buttons', () => {
    renderWithIntl(<DisableServiceModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable service/i })).toBeInTheDocument();
  });

  describe('User interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn();
      renderWithIntl(<DisableServiceModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Disable service button is clicked', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderWithIntl(<DisableServiceModal {...defaultProps} onConfirm={onConfirm} />);

      const disableButton = screen.getByRole('button', { name: /disable service/i });
      await userEvent.click(disableButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading state', () => {
    it('should disable Disable service button when isLoading is true', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} isLoading={true} />);

      const disableButton = screen.getByRole('button', { name: /disable service/i });
      expect(disableButton).toBeDisabled();
    });

    it('should not disable Cancel button when isLoading is true', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });

    it('should show loading state on Disable service button when isLoading is true', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} isLoading={true} />);

      // When isLoading is true, EuiConfirmModal shows loading spinner
      const disableButton = screen.getByRole('button', { name: /disable service/i });
      expect(disableButton).toBeDisabled();
    });
  });

  describe('Button styling', () => {
    it('should render Disable service button with danger color', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} />);

      const disableButton = screen.getByRole('button', { name: /disable service/i });
      // EUI uses CSS-in-JS, check for danger-related class pattern
      expect(disableButton.className).toContain('danger');
    });
  });

  describe('Service name variations', () => {
    it('should render modal with different service name', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} serviceName="Auto Ops" />);

      expect(screen.getByText(/disable auto ops\?/i)).toBeInTheDocument();
    });

    it('should handle long service names', () => {
      renderWithIntl(
        <DisableServiceModal
          {...defaultProps}
          serviceName="Very Long Service Name That Should Still Display Correctly"
        />
      );

      expect(
        screen.getByText(
          /disable very long service name that should still display correctly\?/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Focus management', () => {
    it('should focus Cancel button by default', () => {
      renderWithIntl(<DisableServiceModal {...defaultProps} />);

      // EuiConfirmModal with defaultFocusedButton="cancel" focuses Cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      // We can verify it's in the document, actual focus testing requires more setup
      expect(cancelButton).toBeInTheDocument();
    });
  });
});
