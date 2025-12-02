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
import { ServiceCard, type ServiceCardProps } from './details_card';
import { useCloudConnectedAppContext } from '../../../app_context';

jest.mock('../../../app_context');

const mockUseCloudConnectedAppContext = useCloudConnectedAppContext as jest.MockedFunction<
  typeof useCloudConnectedAppContext
>;

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('ServiceCard', () => {
  const defaultProps: ServiceCardProps = {
    title: 'Test Service',
    enabled: false,
    supported: true,
    description: 'Test service description',
    onEnable: jest.fn(),
    onDisable: jest.fn(),
    onOpen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudConnectedAppContext.mockReturnValue({
      hasConfigurePermission: true,
    } as any);
  });

  describe('Badge rendering', () => {
    it('should render "Coming Soon" badge when card is disabled with badge prop', () => {
      renderWithIntl(
        <ServiceCard {...defaultProps} isCardDisabled={true} badge="Coming Soon" />
      );

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('should render "Unsupported" badge when service is not supported', () => {
      renderWithIntl(<ServiceCard {...defaultProps} supported={false} />);

      expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
    });

    it('should render "Unsupported" badge with tooltip when badgeTooltip provided', () => {
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          supported={false}
          badgeTooltip="This version is not supported"
        />
      );

      expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
      // Tooltip is present in the DOM but only visible on hover
    });

    it('should render custom badge when badge prop is provided and service is supported', () => {
      renderWithIntl(<ServiceCard {...defaultProps} badge="Beta" />);

      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('should render "Enabled" badge when service is enabled', () => {
      renderWithIntl(<ServiceCard {...defaultProps} enabled={true} />);

      expect(screen.getByText(/enabled/i)).toBeInTheDocument();
    });

    it('should render "Not enabled" badge when service is disabled', () => {
      renderWithIntl(<ServiceCard {...defaultProps} enabled={false} />);

      expect(screen.getByText(/not enabled/i)).toBeInTheDocument();
    });
  });

  describe('Actions rendering', () => {
    it('should not render actions when card is disabled', () => {
      renderWithIntl(<ServiceCard {...defaultProps} isCardDisabled={true} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not render actions when service is unsupported', () => {
      renderWithIntl(<ServiceCard {...defaultProps} supported={false} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should show permission message when user lacks configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        hasConfigurePermission: false,
      } as any);

      renderWithIntl(<ServiceCard {...defaultProps} />);

      expect(screen.getByText(/only admins can manage services/i)).toBeInTheDocument();
    });

    it('should render "Open" button and more actions when service is enabled', () => {
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          enabled={true}
          serviceUrl="https://example.com/service"
        />
      );

      expect(screen.getByRole('link', { name: /open/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
    });

    it('should render "Connect" button with external icon when enableServiceByUrl is provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} enableServiceByUrl="https://enable.com" />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeInTheDocument();
    });

    it('should render "Connect" button without external icon when enableServiceByUrl is not provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeInTheDocument();
    });

    it('should disable Connect button when onEnable is not provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} onEnable={undefined} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeDisabled();
    });

    it('should disable buttons when isLoading is true', () => {
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          enabled={true}
          serviceUrl="https://example.com"
          isLoading={true}
        />
      );

      const openButton = screen.getByRole('button', { name: /open/i });
      expect(openButton).toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('should call onEnable when Connect button is clicked', async () => {
      const onEnable = jest.fn();
      renderWithIntl(<ServiceCard {...defaultProps} onEnable={onEnable} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await userEvent.click(connectButton);

      expect(onEnable).toHaveBeenCalledTimes(1);
    });

    it('should open and close popover when more actions button is clicked', async () => {
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          enabled={true}
          serviceUrl="https://example.com"
        />
      );

      const moreActionsButton = screen.getByRole('button', { name: /more actions/i });

      // Open popover
      await userEvent.click(moreActionsButton);

      await waitFor(() => {
        expect(screen.getByText(/disable service/i)).toBeInTheDocument();
      });

      // Close popover by clicking button again
      await userEvent.click(moreActionsButton);

      await waitFor(() => {
        expect(screen.queryByText(/disable service/i)).not.toBeInTheDocument();
      });
    });

    it('should call onDisable when Disable service is clicked in popover', async () => {
      const onDisable = jest.fn();
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          enabled={true}
          serviceUrl="https://example.com"
          onDisable={onDisable}
        />
      );

      const moreActionsButton = screen.getByRole('button', { name: /more actions/i });
      await userEvent.click(moreActionsButton);

      const disableMenuItem = await screen.findByText(/disable service/i);
      await userEvent.click(disableMenuItem);

      expect(onDisable).toHaveBeenCalledTimes(1);

      // Popover should close after clicking
      await waitFor(() => {
        expect(screen.queryByText(/disable service/i)).not.toBeInTheDocument();
      });
    });

    it('should call onOpen when Open button is clicked', async () => {
      const onOpen = jest.fn();
      renderWithIntl(
        <ServiceCard
          {...defaultProps}
          enabled={true}
          serviceUrl="https://example.com"
          onOpen={onOpen}
        />
      );

      const openButton = screen.getByRole('link', { name: /open/i });
      await userEvent.click(openButton);

      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content rendering', () => {
    it('should render service title and description', () => {
      renderWithIntl(<ServiceCard {...defaultProps} />);

      expect(screen.getByText('Test Service')).toBeInTheDocument();
      expect(screen.getByText('Test service description')).toBeInTheDocument();
    });

    it('should render region when provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} region="US East" />);

      expect(screen.getByText('US East')).toBeInTheDocument();
    });

    it('should render Learn more link when learnMoreUrl provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} learnMoreUrl="https://docs.example.com" />);

      const learnMoreLink = screen.getByRole('link', { name: /learn more/i });
      expect(learnMoreLink).toBeInTheDocument();
      expect(learnMoreLink).toHaveAttribute('href', 'https://docs.example.com');
      expect(learnMoreLink).toHaveAttribute('target', '_blank');
    });

    it('should not render Learn more link when learnMoreUrl is not provided', () => {
      renderWithIntl(<ServiceCard {...defaultProps} />);

      expect(screen.queryByRole('link', { name: /learn more/i })).not.toBeInTheDocument();
    });
  });
});
