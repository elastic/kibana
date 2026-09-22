/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useFetchSourceRule } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_source_rule';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { useFetchRule } from '../../../../hooks/use_fetch_rule';
import { RuleSummaryFlyoutContainer } from './rule_summary_flyout_container';

const mockHttp = { basePath: { prepend: (path: string) => `/base${path}` } };
jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'CoreStart(http)') return mockHttp;
    return { canWrite: () => true };
  },
  CoreStart: (key: string) => `CoreStart(${key})`,
}));

jest.mock('../../../../hooks/use_fetch_rule', () => ({ useFetchRule: jest.fn() }));
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_source_rule', () => ({
  useFetchSourceRule: jest.fn(),
}));

const mockMutation = { mutate: jest.fn(), isLoading: false };
jest.mock('../../../../hooks/use_delete_rule', () => ({ useDeleteRule: () => mockMutation }));
jest.mock('../../../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => mockMutation,
}));
jest.mock('../../../../hooks/use_run_rule', () => ({ useRunRule: () => mockMutation }));
jest.mock('../../../../hooks/use_bulk_update_rule_api_key', () => ({
  useBulkUpdateRuleApiKey: () => mockMutation,
}));

jest.mock('./rule_summary_flyout', () => ({
  RuleSummaryFlyout: ({
    rule,
    isToggleLoading,
  }: {
    rule: RuleApiResponse;
    isToggleLoading?: boolean;
  }) => (
    <div
      data-test-subj="mockRuleSummaryFlyout"
      data-toggle-loading={isToggleLoading ? 'true' : 'false'}
    >
      {rule.metadata.name}
    </div>
  ),
}));

jest.mock('../../../loading_flyout', () => ({
  LoadingFlyout: ({ type }: { type?: string }) => (
    <div data-test-subj="mockLoadingFlyout" data-type={type} />
  ),
}));

jest.mock('../../../entity_not_found_flyout', () => ({
  EntityNotFoundFlyout: ({ type }: { type?: string }) => (
    <div data-test-subj="mockEntityNotFoundFlyout" data-type={type} />
  ),
}));

jest.mock('../source_rule_summary_flyout', () => ({
  SourceRuleSummaryFlyout: ({
    rule,
    ruleDetailsHref,
  }: {
    rule: RuleResponse;
    ruleDetailsHref: string | null;
  }) => (
    <div data-test-subj="mockSourceRuleSummaryFlyout" data-href={ruleDetailsHref}>
      {rule.metadata?.name}
    </div>
  ),
}));

const mockUseFetchRule = jest.mocked(useFetchRule);
const mockUseFetchSourceRule = jest.mocked(useFetchSourceRule);

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
  ({ data: undefined, isLoading: false, isError: false, error: null, ...result } as ReturnType<
    typeof useFetchRule
  >);

const noSourceRule: ReturnType<typeof useFetchSourceRule> = {
  rule: undefined,
  ruleDetailsHref: null,
  isLoading: false,
  isError: false,
};

describe('RuleSummaryFlyoutContainer', () => {
  beforeEach(() => {
    mockMutation.isLoading = false;
    mockUseFetchSourceRule.mockReturnValue(noSourceRule);
  });

  describe('v2 rules (no sourceRuleInfo)', () => {
    it('renders the loading flyout while the rule is in flight', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isLoading: true }));

      renderContainer();

      expect(screen.getByTestId('mockLoadingFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('mockLoadingFlyout')).toHaveAttribute('data-type', 'overlay');
    });

    it('renders the fetched rule', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('Fetched rule') }));

      renderContainer();

      expect(screen.getByTestId('mockRuleSummaryFlyout')).toHaveTextContent('Fetched rule');
    });

    it('forwards toggle loading to the flyout', () => {
      mockMutation.isLoading = true;
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('My Rule') }));

      renderContainer();

      expect(screen.getByTestId('mockRuleSummaryFlyout')).toHaveAttribute(
        'data-toggle-loading',
        'true'
      );
    });

    it('renders the not found flyout when the v2 fetch fails', () => {
      mockUseFetchRule.mockReturnValue(
        mockFetchRuleResult({ isError: true, error: new Error('server error') })
      );

      renderContainer();

      expect(screen.getByTestId('mockEntityNotFoundFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('mockEntityNotFoundFlyout')).toHaveAttribute(
        'data-type',
        'overlay'
      );
      expect(screen.queryByTestId('mockRuleSummaryFlyout')).not.toBeInTheDocument();
    });

    it('does not call useFetchRule with undefined when sourceRuleInfo is absent', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('My Rule') }));

      renderContainer();

      expect(mockUseFetchRule).toHaveBeenCalledWith('rule-1');
    });
  });

  describe('source rules (sourceRuleInfo provided)', () => {
    it('skips the v2 fetch and resolves via the data source', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isLoading: true }));
      mockUseFetchSourceRule.mockReturnValue({
        rule: { id: 'rule-1', metadata: { name: 'Classic rule' } } as unknown as RuleResponse,
        ruleDetailsHref: '/base/app/management/insightsAndAlerting/triggersActions/rule/rule-1',
        isLoading: false,
        isError: false,
      });

      renderContainer({ sourceRuleInfo: {} });

      expect(mockUseFetchRule).toHaveBeenCalledWith(undefined);
      expect(screen.getByTestId('mockSourceRuleSummaryFlyout')).toHaveTextContent('Classic rule');
      expect(screen.getByTestId('mockSourceRuleSummaryFlyout')).toHaveAttribute(
        'data-href',
        '/base/app/management/insightsAndAlerting/triggersActions/rule/rule-1'
      );
    });

    it('renders loading while the source rule is being resolved', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue({
        ...noSourceRule,
        isLoading: true,
      });

      renderContainer({ sourceRuleInfo: {} });

      expect(screen.getByTestId('mockLoadingFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('mockLoadingFlyout')).toHaveAttribute('data-type', 'overlay');
    });

    it('renders entity not found when the source cannot resolve the rule', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue(noSourceRule);

      renderContainer({ sourceRuleInfo: {} });

      expect(screen.getByTestId('mockEntityNotFoundFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('mockEntityNotFoundFlyout')).toHaveAttribute(
        'data-type',
        'overlay'
      );
    });

    it('forwards cachedRule as initialRule to the source fetch', () => {
      const cachedRule = makeRule('Cached classic');
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue({
        rule: cachedRule as unknown as RuleResponse,
        ruleDetailsHref: null,
        isLoading: false,
        isError: false,
      });

      renderContainer({ sourceRuleInfo: {}, cachedRule });

      expect(mockUseFetchSourceRule).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-1',
          initialRule: cachedRule,
        })
      );
    });
  });
});
