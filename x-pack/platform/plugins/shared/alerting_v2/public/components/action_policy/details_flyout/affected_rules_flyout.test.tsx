/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../../../services/rules_api';
import { createMockLocators, MockLocatorProvider } from '../../../test_utils/test_providers';
import { AffectedRulesFlyout } from './affected_rules_flyout';

const mockUseFetchMatchingRules = jest.fn();

jest.mock('../../../hooks/use_fetch_matching_rules', () => ({
  useFetchMatchingRules: (params: unknown) => mockUseFetchMatchingRules(params),
}));

const createRule = (id: string, name: string, tags?: string[]): RuleApiResponse =>
  ({ id, metadata: { name, tags } } as RuleApiResponse);

const renderFlyout = (matcher?: PolicyMatcher | null) => {
  const locators = createMockLocators();
  jest
    .mocked(locators.rulesLocators.getRedirectUrl)
    .mockImplementation(({ ruleId }) => `/app/rules/${ruleId}`);
  const onClose = jest.fn();

  render(
    <MockLocatorProvider locators={locators}>
      <I18nProvider>
        <AffectedRulesFlyout matcher={matcher} historyKey={Symbol('test')} onClose={onClose} />
      </I18nProvider>
    </MockLocatorProvider>
  );

  return { locators, onClose };
};

describe('AffectedRulesFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchMatchingRules.mockReturnValue({
      data: {
        items: [createRule('rule-1', 'CPU usage', ['cpu', 'prod']), createRule('rule-2', 'Memory')],
        total: 25,
        page: 1,
        per_page: 10,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  it('renders the title and the policy scope', () => {
    renderFlyout({ tags: ['cpu'], expression: 'data.severity : "critical"' });

    expect(screen.getByText('Affected rules')).toBeInTheDocument();
    const policyScope = screen.getByTestId('actionPolicyAffectedRulesPolicyScope');
    expect(within(policyScope).getByText('Policy scope')).toBeInTheDocument();
    expect(within(policyScope).getByText('cpu')).toBeInTheDocument();
    expect(within(policyScope).getByText('data.severity : "critical"')).toBeInTheDocument();
  });

  it('lists the rules matching the policy tags', () => {
    const matcher = { tags: ['cpu', 'prod'] };
    renderFlyout(matcher);

    expect(mockUseFetchMatchingRules).toHaveBeenCalledWith({ matcher, page: 1, perPage: 10 });
    const table = screen.getByTestId('actionPolicyAffectedRulesTable');
    expect(within(table).getByText('CPU usage')).toBeInTheDocument();
    expect(within(table).getByText('Memory')).toBeInTheDocument();
    expect(within(table).getByText('prod')).toBeInTheDocument();
    expect(
      screen.queryByTestId('actionPolicyAffectedRulesMatchingQueryCallout')
    ).not.toBeInTheDocument();
  });

  it('says the matching query decides which alerts of the listed rules are handled', () => {
    const matcher = { tags: ['cpu'], expression: 'data.severity : "critical"' };
    renderFlyout(matcher);

    expect(screen.getByTestId('actionPolicyAffectedRulesMatchingQueryCallout')).toHaveTextContent(
      'These rules have at least one of the policy tags. The matching query decides which of their alerts this policy handles.'
    );
    expect(mockUseFetchMatchingRules).toHaveBeenCalledWith({ matcher, page: 1, perPage: 10 });
    expect(screen.getByTestId('actionPolicyAffectedRulesTable')).toBeInTheDocument();
  });

  it('links each rule name to its details page in a new tab', () => {
    const { locators } = renderFlyout({ tags: ['cpu'] });

    const link = screen.getByTestId('actionPolicyAffectedRulesRuleNameLink-rule-1');
    expect(link).toHaveTextContent('CPU usage');
    expect(link).toHaveAttribute('href', '/app/rules/rule-1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(locators.rulesLocators.getRedirectUrl).toHaveBeenCalledWith({ ruleId: 'rule-1' });
  });

  it('fetches the next page when paginating', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderFlyout({ tags: ['cpu'] });

    await user.click(screen.getByTestId('pagination-button-next'));

    expect(mockUseFetchMatchingRules).toHaveBeenLastCalledWith({
      matcher: { tags: ['cpu'] },
      page: 2,
      perPage: 10,
    });
  });

  it('does not offer pages beyond the API result window', () => {
    mockUseFetchMatchingRules.mockReturnValue({
      data: { items: [createRule('rule-1', 'CPU usage')], total: 20000, page: 1, per_page: 10 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    renderFlyout({ tags: ['cpu'] });

    expect(screen.getByTestId('pagination-button-999')).toBeInTheDocument();
    expect(screen.queryByTestId('pagination-button-1999')).not.toBeInTheDocument();
  });

  it('shows a loading message until the first page of rules arrives', () => {
    mockUseFetchMatchingRules.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
    });
    renderFlyout({ tags: ['cpu'] });

    expect(
      within(screen.getByTestId('actionPolicyAffectedRulesTable')).getByText('Loading rules…')
    ).toBeInTheDocument();
  });

  it('says no rule matches when no alert rule has the policy tags', () => {
    mockUseFetchMatchingRules.mockReturnValue({
      data: { items: [], total: 0, page: 1, per_page: 10 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    renderFlyout({ tags: ['unknown'] });

    expect(
      within(screen.getByTestId('actionPolicyAffectedRulesTable')).getByText(
        'No rules that create alerts have any of the tags in this policy scope.'
      )
    ).toBeInTheDocument();
  });

  it('shows an error in the table when the rules fail to load', () => {
    mockUseFetchMatchingRules.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    });
    renderFlyout({ tags: ['cpu'] });

    expect(
      within(screen.getByTestId('actionPolicyAffectedRulesTable')).getByText(
        'Unable to load the rules affected by this policy.'
      )
    ).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onClose } = renderFlyout({ tags: ['cpu'] });

    await user.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
