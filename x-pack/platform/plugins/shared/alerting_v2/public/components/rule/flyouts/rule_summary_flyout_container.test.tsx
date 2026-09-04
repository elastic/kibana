/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { RuleSummaryFlyoutContainer } from './rule_summary_flyout_container';

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ canWrite: () => true }),
  CoreStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_fetch_rule', () => ({ useFetchRule: jest.fn() }));

const mockMutation = { mutate: jest.fn(), isLoading: false };
jest.mock('../../../hooks/use_delete_rule', () => ({ useDeleteRule: () => mockMutation }));
jest.mock('../../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => mockMutation,
}));
jest.mock('../../../hooks/use_run_rule', () => ({ useRunRule: () => mockMutation }));
jest.mock('../../../hooks/use_bulk_update_rule_api_key', () => ({
  useBulkUpdateRuleApiKey: () => mockMutation,
}));

jest.mock('./rule_summary_flyout', () => ({
  RuleSummaryFlyout: ({ rule, type }: { rule: RuleApiResponse; type?: string }) => (
    <div data-test-subj="mockRuleSummaryFlyout" data-flyout-type={type}>
      {rule.metadata.name}
    </div>
  ),
}));

jest.mock('../../loading_flyout', () => ({
  LoadingFlyout: () => <div data-test-subj="mockLoadingFlyout" />,
}));

jest.mock('../../entity_not_found_flyout', () => ({
  EntityNotFoundFlyout: () => <div data-test-subj="mockEntityNotFoundFlyout" />,
}));

const mockUseFetchRule = jest.mocked(useFetchRule);

const makeRule = (name: string) =>
  ({ id: 'rule-1', metadata: { name } } as unknown as RuleApiResponse);

type ContainerProps = React.ComponentProps<typeof RuleSummaryFlyoutContainer>;

const renderContainer = (overrides: Partial<ContainerProps> = {}) =>
  render(
    <I18nProvider>
      <RuleSummaryFlyoutContainer
        ruleId="rule-1"
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onClone={jest.fn()}
        {...overrides}
      />
    </I18nProvider>
  );

const mockFetchRuleResult = (
  result: Partial<ReturnType<typeof useFetchRule>>
): ReturnType<typeof useFetchRule> =>
  ({ data: undefined, isLoading: false, isError: false, ...result } as ReturnType<
    typeof useFetchRule
  >);

describe('RuleSummaryFlyoutContainer', () => {
  it('renders the loading flyout while the rule is in flight', () => {
    mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isLoading: true }));

    renderContainer();

    expect(screen.getByTestId('mockLoadingFlyout')).toBeInTheDocument();
  });

  it('renders a push flyout by default', () => {
    mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('My Rule') }));

    renderContainer();

    expect(screen.getByTestId('mockRuleSummaryFlyout')).toHaveAttribute('data-flyout-type', 'push');
  });

  it('renders the requested flyout type', () => {
    mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('My Rule') }));

    renderContainer({ type: 'overlay' });

    expect(screen.getByTestId('mockRuleSummaryFlyout')).toHaveAttribute(
      'data-flyout-type',
      'overlay'
    );
  });

  it('renders the fetched rule', () => {
    mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('Fetched rule') }));

    renderContainer();

    expect(screen.getByTestId('mockRuleSummaryFlyout')).toHaveTextContent('Fetched rule');
  });

  it('renders the not found flyout when the fetch fails', () => {
    mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isError: true }));

    renderContainer();

    expect(screen.getByTestId('mockEntityNotFoundFlyout')).toBeInTheDocument();
    expect(screen.queryByTestId('mockRuleSummaryFlyout')).not.toBeInTheDocument();
  });
});
