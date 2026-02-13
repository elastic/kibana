/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { AccountType } from '../../../../common/types';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../../common';

import { AccountBadge } from './account_badge';

describe('AccountBadge', () => {
  const renderBadge = (accountType?: AccountType, variant?: 'default' | 'flyout') => {
    return render(
      <I18nProvider>
        <AccountBadge accountType={accountType} variant={variant} />
      </I18nProvider>
    );
  };

  describe('rendering with different account types', () => {
    it('renders "Single Account" badge when accountType is "single-account"', () => {
      renderBadge(SINGLE_ACCOUNT);
      expect(screen.getByText('Single Account')).toBeInTheDocument();
    });

    it('renders "Organization" badge when accountType is "organization-account"', () => {
      renderBadge(ORGANIZATION_ACCOUNT);
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    it('returns null when accountType is undefined', () => {
      const { container } = renderBadge(undefined);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('variant prop behavior', () => {
    it('uses color="default" when variant is "flyout"', () => {
      const { container } = renderBadge(SINGLE_ACCOUNT, 'flyout');
      const badge = container.querySelector('.euiBadge');
      expect(badge?.className).toMatch(/euiBadge-default/);
    });

    it('uses color="hollow" when variant is "default"', () => {
      const { container } = renderBadge(SINGLE_ACCOUNT, 'default');
      const badge = container.querySelector('.euiBadge');
      expect(badge?.className).toMatch(/euiBadge-hollow/);
    });

    it('uses color="hollow" when no variant is provided', () => {
      const { container } = renderBadge(SINGLE_ACCOUNT);
      const badge = container.querySelector('.euiBadge');
      expect(badge?.className).toMatch(/euiBadge-hollow/);
    });
  });

  describe('badge content', () => {
    it('displays correct label for single account type with default variant', () => {
      renderBadge(SINGLE_ACCOUNT, 'default');
      const badge = screen.getByText('Single Account');
      expect(badge).toBeInTheDocument();
    });

    it('displays correct label for organization account type with flyout variant', () => {
      renderBadge(ORGANIZATION_ACCOUNT, 'flyout');
      const badge = screen.getByText('Organization');
      expect(badge).toBeInTheDocument();
    });
  });
});
