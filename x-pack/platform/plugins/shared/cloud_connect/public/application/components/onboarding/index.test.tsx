/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { OnboardingPage } from './index';
import { useCloudConnectedAppContext } from '../../app_context';
import type { CloudConnectedAppContextValue } from '../../app_context';

jest.mock('../../app_context');
jest.mock('./connection_wizard', () => ({
  ConnectionWizard: ({ onConnect }: { onConnect: () => void }) => (
    <div data-test-subj="connection-wizard">Connection Wizard Mock</div>
  ),
}));
jest.mock('./service_cards', () => ({
  ServiceCards: ({ hasPermissions }: { hasPermissions?: boolean }) => (
    <div data-test-subj="service-cards">
      Service Cards Mock - hasPermissions: {String(hasPermissions)}
    </div>
  ),
}));

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

describe('OnboardingPage', () => {
  const mockOnConnect = jest.fn();
  const mockContext: Partial<CloudConnectedAppContextValue> = {
    http: {
      basePath: {
        prepend: jest.fn((path: string) => `/base${path}`),
      },
    } as any,
    docLinks: {
      links: {
        cloud: {
          cloudConnect: 'https://docs.elastic.co/cloud-connect',
        },
      },
    } as any,
    hasConfigurePermission: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudConnectedAppContext.mockReturnValue(mockContext as CloudConnectedAppContextValue);
  });

  it('should render page title and description', () => {
    renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

    expect(screen.getByText(/get started with cloud connect/i)).toBeInTheDocument();
    expect(
      screen.getByText(/with cloud connect, you can use elastic cloud services/i)
    ).toBeInTheDocument();
  });

  it('should render Learn more link with correct href', () => {
    renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

    const learnMoreLink = screen.getByRole('link', { name: /learn more/i });
    expect(learnMoreLink).toBeInTheDocument();
    expect(learnMoreLink).toHaveAttribute('href', 'https://docs.elastic.co/cloud-connect');
    expect(learnMoreLink).toHaveAttribute('target', '_blank');
  });

  it('should render illustration image with correct src', () => {
    renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

    const image = screen.getByAltText(/illustration for cloud data migration/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute(
      'src',
      '/base/plugins/kibanaReact/assets/illustration_cloud_migration.png'
    );
  });

  describe('Permission-based rendering', () => {
    it('should render ConnectionWizard when user has configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: true,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(screen.getByTestId('connection-wizard')).toBeInTheDocument();
    });

    it('should not render ConnectionWizard when user lacks configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: false,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(screen.queryByTestId('connection-wizard')).not.toBeInTheDocument();
    });

    it('should show permission warning message when user lacks configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: false,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(
        screen.getByText(/you must have all privileges granted to connect a cluster/i)
      ).toBeInTheDocument();
    });

    it('should not show permission warning message when user has configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: true,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(
        screen.queryByText(/you must have all privileges granted to connect a cluster/i)
      ).not.toBeInTheDocument();
    });

    it('should pass hasPermissions=true to ServiceCards when user has permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: true,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      const serviceCards = screen.getByTestId('service-cards');
      expect(serviceCards).toHaveTextContent('hasPermissions: true');
    });

    it('should pass hasPermissions=false to ServiceCards when user lacks permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: false,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      const serviceCards = screen.getByTestId('service-cards');
      expect(serviceCards).toHaveTextContent('hasPermissions: false');
    });
  });

  describe('Layout', () => {
    it('should render ServiceCards for all users regardless of permission', () => {
      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(screen.getByTestId('service-cards')).toBeInTheDocument();
    });

    it('should render ConnectionWizard and ServiceCards side by side when user has permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: true,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(screen.getByTestId('connection-wizard')).toBeInTheDocument();
      expect(screen.getByTestId('service-cards')).toBeInTheDocument();
    });

    it('should render only ServiceCards when user lacks permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue({
        ...mockContext,
        hasConfigurePermission: false,
      } as CloudConnectedAppContextValue);

      renderWithIntl(<OnboardingPage onConnect={mockOnConnect} />);

      expect(screen.queryByTestId('connection-wizard')).not.toBeInTheDocument();
      expect(screen.getByTestId('service-cards')).toBeInTheDocument();
    });
  });
});
