/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { OverviewSection } from '.';

// Mock the SubscriptionBadge component
jest.mock('./subscription_badge', () => ({
  SubscriptionBadge: ({ subscription }: { subscription: string }) => (
    <span data-test-subj="subscription-badge-mock">{subscription}</span>
  ),
}));

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('OverviewSection', () => {
  const defaultProps = {
    organizationId: '12345',
    connectedAt: '2024-12-01T10:00:00.000Z',
  };

  describe('Content rendering', () => {
    it('should render Overview title', () => {
      renderWithIntl(<OverviewSection {...defaultProps} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('should render organization ID with label', () => {
      renderWithIntl(<OverviewSection {...defaultProps} organizationId="98765" />);

      expect(screen.getByText('Cloud Organization ID')).toBeInTheDocument();
      expect(screen.getByText('98765')).toBeInTheDocument();
    });

    it('should render formatted connection date with label', () => {
      renderWithIntl(<OverviewSection {...defaultProps} connectedAt="2025-01-15T14:30:00.000Z" />);

      expect(screen.getByText('Connected on')).toBeInTheDocument();
      // Date should be formatted by moment - checking it exists
      expect(screen.getByText(/January|2025/i)).toBeInTheDocument();
    });
  });

  describe('Subscription badge rendering', () => {
    it('should render subscription badge when subscription is provided', () => {
      renderWithIntl(<OverviewSection {...defaultProps} subscription="active" />);

      expect(screen.getByText('Cloud subscription')).toBeInTheDocument();
      expect(screen.getByTestId('subscription-badge-mock')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should not render subscription section when subscription is undefined', () => {
      renderWithIntl(<OverviewSection {...defaultProps} />);

      expect(screen.queryByText('Cloud subscription')).not.toBeInTheDocument();
      expect(screen.queryByTestId('subscription-badge-mock')).not.toBeInTheDocument();
    });

    it('should pass subscription value to SubscriptionBadge component', () => {
      renderWithIntl(<OverviewSection {...defaultProps} subscription="trial" />);

      expect(screen.getByTestId('subscription-badge-mock')).toBeInTheDocument();
      expect(screen.getByText('trial')).toBeInTheDocument();
    });

    it('should handle inactive subscription', () => {
      renderWithIntl(<OverviewSection {...defaultProps} subscription="inactive" />);

      expect(screen.getByTestId('subscription-badge-mock')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render all three fields when subscription is provided', () => {
      renderWithIntl(<OverviewSection {...defaultProps} subscription="active" />);

      expect(screen.getByText('Cloud Organization ID')).toBeInTheDocument();
      expect(screen.getByText('Connected on')).toBeInTheDocument();
      expect(screen.getByText('Cloud subscription')).toBeInTheDocument();
    });

    it('should render only two fields when subscription is not provided', () => {
      renderWithIntl(<OverviewSection {...defaultProps} />);

      expect(screen.getByText('Cloud Organization ID')).toBeInTheDocument();
      expect(screen.getByText('Connected on')).toBeInTheDocument();
      expect(screen.queryByText('Cloud subscription')).not.toBeInTheDocument();
    });
  });

  describe('Date formatting', () => {
    it('should format date using moment LL format', () => {
      // December 2, 2025 should be formatted as "December 2, 2025" in en locale
      renderWithIntl(<OverviewSection {...defaultProps} connectedAt="2025-12-02T10:00:00.000Z" />);

      // Check for month name and year (moment formats as "December 2, 2025")
      const formattedDate = screen.getByText(/December.*2025/i);
      expect(formattedDate).toBeInTheDocument();
    });

    it('should handle different date formats', () => {
      renderWithIntl(<OverviewSection {...defaultProps} connectedAt="2024-01-01T00:00:00.000Z" />);

      // Should render January 1, 2024
      expect(screen.getByText(/January.*2024/i)).toBeInTheDocument();
    });
  });
});
