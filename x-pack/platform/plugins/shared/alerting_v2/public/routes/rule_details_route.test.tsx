/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleDetailsRoute } from './rule_details_route';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
}));

const mockUseExistingRule = jest.fn();
jest.mock('../hooks/use_existing_rule', () => ({
  useExistingRule: (...args: unknown[]) => mockUseExistingRule(...args),
}));

jest.mock('../components/rule_details/skeleton', () => ({
  Skeleton: () => <div data-test-subj="skeleton">Loading...</div>,
}));

jest.mock('../components/rule_details/rule_detail_page', () => ({
  RuleDetailPage: ({ rule }: { rule: { id: string } }) => (
    <div data-test-subj="ruleDetailPage">Rule: {rule.id}</div>
  ),
}));

const renderRoute = (ruleId = 'rule-1') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/${ruleId}`]}>
        <Route path="/:ruleId">
          <RuleDetailsRoute />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

describe('RuleDetailsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton while loading', () => {
    mockUseExistingRule.mockReturnValue({ rule: undefined, isLoading: true, error: null });
    renderRoute();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders error prompt when rule fails to load', () => {
    mockUseExistingRule.mockReturnValue({
      rule: undefined,
      isLoading: false,
      error: new Error('Not found'),
    });
    renderRoute();
    expect(screen.getByTestId('ruleDetailsErrorPrompt')).toBeInTheDocument();
    expect(screen.getByText('Unable to load rule')).toBeInTheDocument();
  });

  it('renders error prompt when rule is undefined after loading', () => {
    mockUseExistingRule.mockReturnValue({ rule: undefined, isLoading: false, error: null });
    renderRoute();
    expect(screen.getByTestId('ruleDetailsErrorPrompt')).toBeInTheDocument();
  });

  it('renders the detail page when rule is loaded', async () => {
    mockUseExistingRule.mockReturnValue({
      rule: { id: 'rule-1' },
      isLoading: false,
      error: null,
    });
    renderRoute();
    expect(await screen.findByTestId('ruleDetailPage')).toHaveTextContent('Rule: rule-1');
  });

  it('passes the ruleId from URL params to useExistingRule', () => {
    mockUseExistingRule.mockReturnValue({ rule: undefined, isLoading: true, error: null });
    renderRoute('my-custom-id');
    expect(mockUseExistingRule).toHaveBeenCalledWith('my-custom-id');
  });

  it('navigates back to rules list when back button is clicked', () => {
    mockUseExistingRule.mockReturnValue({
      rule: undefined,
      isLoading: false,
      error: new Error('fail'),
    });
    renderRoute();
    screen.getByTestId('ruleDetailsErrorBackButton').click();
    expect(mockHistoryPush).toHaveBeenCalledWith('/');
  });
});
