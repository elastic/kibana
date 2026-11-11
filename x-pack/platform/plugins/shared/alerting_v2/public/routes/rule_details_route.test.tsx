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
import { createMockLocators, MockLocatorProvider } from '../test_utils/test_providers';
import { RuleDetailsRoute } from './rule_details_route';

const mockLocators = createMockLocators();

const mockUseFetchRule = jest.fn();
jest.mock('../hooks/use_fetch_rule', () => ({
  useFetchRule: (...args: unknown[]) => mockUseFetchRule(...args),
}));

jest.mock('../components/rule_details/skeleton', () => ({
  Skeleton: () => <div data-test-subj="skeleton">Loading...</div>,
}));

jest.mock('../components/rule_details/rule_detail_page', () => ({
  RuleDetailPage: () => <div data-test-subj="ruleDetailPage">Rule detail page</div>,
}));

const renderRoute = (ruleId = 'rule-1') =>
  render(
    <I18nProvider>
      <MockLocatorProvider locators={mockLocators}>
        <MemoryRouter initialEntries={[`/${ruleId}`]}>
          <Route path="/:ruleId">
            <RuleDetailsRoute />
          </Route>
        </MemoryRouter>
      </MockLocatorProvider>
    </I18nProvider>
  );

describe('RuleDetailsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton while loading', () => {
    mockUseFetchRule.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderRoute();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders error prompt when rule fails to load', () => {
    mockUseFetchRule.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderRoute();
    expect(screen.getByTestId('ruleDetailsErrorPrompt')).toBeInTheDocument();
    expect(screen.getByText('Unable to load rule')).toBeInTheDocument();
  });

  it('renders error prompt when rule is undefined after loading', () => {
    mockUseFetchRule.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    renderRoute();
    expect(screen.getByTestId('ruleDetailsErrorPrompt')).toBeInTheDocument();
  });

  it('renders the detail page when rule is loaded', async () => {
    mockUseFetchRule.mockReturnValue({
      data: { id: 'rule-1' },
      isLoading: false,
      isError: false,
    });
    renderRoute();
    expect(await screen.findByTestId('ruleDetailPage')).toBeInTheDocument();
  });

  it('passes the ruleId from URL params to useFetchRule', () => {
    mockUseFetchRule.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderRoute('my-custom-id');
    expect(mockUseFetchRule).toHaveBeenCalledWith('my-custom-id');
  });

  it('links back to the host-aware rules list when the rule fails to load', () => {
    mockUseFetchRule.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderRoute();
    expect(mockLocators.rulesLocators.useUrl).toHaveBeenCalledWith({});
    expect(screen.getByTestId('ruleDetailsErrorBackButton')).toHaveAttribute(
      'href',
      '/mock-locator-url'
    );
  });
});
