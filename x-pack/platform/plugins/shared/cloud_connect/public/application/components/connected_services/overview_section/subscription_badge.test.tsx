/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SubscriptionBadge } from './subscription_badge';

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('SubscriptionBadge', () => {
  describe('Badge color rendering', () => {
    it('should render badge for active subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="active" />);

      const badge = screen.getByText('Active');
      expect(badge).toBeInTheDocument();
    });

    it('should render badge for trial subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="trial" />);

      const badge = screen.getByText('Trial');
      expect(badge).toBeInTheDocument();
    });

    it('should render badge for inactive subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="inactive" />);

      const badge = screen.getByText('Inactive');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Badge text capitalization', () => {
    it('should capitalize "active" to "Active"', () => {
      renderWithIntl(<SubscriptionBadge subscription="active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should capitalize "trial" to "Trial"', () => {
      renderWithIntl(<SubscriptionBadge subscription="trial" />);
      expect(screen.getByText('Trial')).toBeInTheDocument();
    });

    it('should capitalize "inactive" to "Inactive"', () => {
      renderWithIntl(<SubscriptionBadge subscription="inactive" />);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should capitalize mixed case input', () => {
      renderWithIntl(<SubscriptionBadge subscription="ACTIVE" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Tooltip rendering for inactive subscription', () => {
    it('should show info icon for inactive subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="inactive" />);

      const badge = screen.getByText('Inactive');
      const badgeElement = badge.closest('.euiBadge');

      // Check for info icon
      expect(badgeElement?.querySelector('[data-euiicon-type="info"]')).toBeInTheDocument();
    });

    it('should not show info icon for active subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="active" />);

      const badge = screen.getByText('Active');
      const badgeElement = badge.closest('.euiBadge');

      // Should not have info icon
      expect(badgeElement?.querySelector('[data-euiicon-type="info"]')).not.toBeInTheDocument();
    });

    it('should not show info icon for trial subscription', () => {
      renderWithIntl(<SubscriptionBadge subscription="trial" />);

      const badge = screen.getByText('Trial');
      const badgeElement = badge.closest('.euiBadge');

      // Should not have info icon
      expect(badgeElement?.querySelector('[data-euiicon-type="info"]')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should render default badge for unknown subscription state', () => {
      renderWithIntl(<SubscriptionBadge subscription="unknown" />);

      const badge = screen.getByText('Unknown');
      expect(badge).toBeInTheDocument();
    });
  });
});
