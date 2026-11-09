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
    ruleId,
    rule,
    isLoading,
    isToggleLoading,
  }: {
    ruleId: string;
    rule?: RuleApiResponse;
    isLoading?: boolean;
    isToggleLoading?: boolean;
  }) => (
    <div
      data-test-subj="mockRuleSummaryFlyout"
      data-rule-id={ruleId}
      data-loading={String(Boolean(isLoading))}
      data-has-rule={String(Boolean(rule))}
      data-toggle-loading={isToggleLoading ? 'true' : 'false'}
    >
      {rule?.metadata.name}
    </div>
  ),
}));

jest.mock('../source_rule_summary_flyout', () => ({
  SourceRuleSummaryFlyout: ({
    rule,
    isLoading,
    ruleDetailsHref,
  }: {
    rule?: RuleResponse;
    isLoading?: boolean;
    ruleDetailsHref: string | null;
  }) => (
    <div
      data-test-subj="mockSourceRuleSummaryFlyout"
      data-href={ruleDetailsHref}
      data-loading={String(Boolean(isLoading))}
      data-has-rule={String(Boolean(rule))}
    >
      {rule?.metadata?.name}
    </div>
  ),
}));

const mockUseFetchRule = jest.mocked(useFetchRule);
const mockUseFetchSourceRule = jest.mocked(useFetchSourceRule);

const makeRule = (name: string) =>
  ({ id: 'rule-1', metadata: { name } } as unknown as RuleApiResponse);

type ContainerProps = React.ComponentProps<typeof RuleSummaryFlyoutContainer>;

const containerElement = (overrides: Partial<ContainerProps> = {}) => (
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

const renderContainer = (overrides: Partial<ContainerProps> = {}) =>
  render(containerElement(overrides));

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
    it('renders the rule summary flyout in its loading state while the rule is in flight', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isLoading: true }));

      renderContainer();

      const flyout = screen.getByTestId('mockRuleSummaryFlyout');
      expect(flyout).toHaveAttribute('data-rule-id', 'rule-1');
      expect(flyout).toHaveAttribute('data-loading', 'true');
      expect(flyout).toHaveAttribute('data-has-rule', 'false');
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

    it('renders the rule summary flyout without a rule when the v2 fetch fails', () => {
      mockUseFetchRule.mockReturnValue(
        mockFetchRuleResult({
          data: makeRule('Stale rule'),
          isError: true,
          error: new Error('server error'),
        })
      );

      renderContainer();

      const flyout = screen.getByTestId('mockRuleSummaryFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-has-rule', 'false');
    });

    it('renders the rule summary flyout without a rule when the rule does not exist', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));

      renderContainer();

      const flyout = screen.getByTestId('mockRuleSummaryFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-has-rule', 'false');
    });

    it('keeps the same flyout mounted when the rule finishes loading', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ isLoading: true }));
      const { rerender } = renderContainer();
      const loadingFlyout = screen.getByTestId('mockRuleSummaryFlyout');

      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({ data: makeRule('Loaded rule') }));
      rerender(containerElement());

      const loadedFlyout = screen.getByTestId('mockRuleSummaryFlyout');
      expect(loadedFlyout).toBe(loadingFlyout);
      expect(loadedFlyout).toHaveAttribute('data-loading', 'false');
      expect(loadedFlyout).toHaveTextContent('Loaded rule');
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

    it('renders the source flyout in its loading state while the source rule is being resolved', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue({
        ...noSourceRule,
        isLoading: true,
      });

      renderContainer({ sourceRuleInfo: {} });

      const flyout = screen.getByTestId('mockSourceRuleSummaryFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'true');
      expect(flyout).toHaveAttribute('data-has-rule', 'false');
      expect(screen.queryByTestId('mockRuleSummaryFlyout')).not.toBeInTheDocument();
    });

    it('keeps the same source flyout mounted when the source rule finishes loading', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue({ ...noSourceRule, isLoading: true });
      const { rerender } = renderContainer({ sourceRuleInfo: {} });
      const loadingFlyout = screen.getByTestId('mockSourceRuleSummaryFlyout');

      mockUseFetchSourceRule.mockReturnValue({
        ...noSourceRule,
        rule: { id: 'rule-1', metadata: { name: 'Loaded classic' } } as unknown as RuleResponse,
      });
      rerender(containerElement({ sourceRuleInfo: {} }));

      const loadedFlyout = screen.getByTestId('mockSourceRuleSummaryFlyout');
      expect(loadedFlyout).toBe(loadingFlyout);
      expect(loadedFlyout).toHaveAttribute('data-loading', 'false');
      expect(loadedFlyout).toHaveTextContent('Loaded classic');
    });

    it('renders the source flyout without a rule when the source cannot resolve the rule', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue(noSourceRule);

      renderContainer({ sourceRuleInfo: {} });

      const flyout = screen.getByTestId('mockSourceRuleSummaryFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-has-rule', 'false');
      expect(screen.queryByTestId('mockRuleSummaryFlyout')).not.toBeInTheDocument();
    });

    it('renders the source flyout without a rule when the source fetch fails', () => {
      mockUseFetchRule.mockReturnValue(mockFetchRuleResult({}));
      mockUseFetchSourceRule.mockReturnValue({
        ...noSourceRule,
        rule: { id: 'rule-1', metadata: { name: 'Stale' } } as unknown as RuleResponse,
        isError: true,
      });

      renderContainer({ sourceRuleInfo: {} });

      expect(screen.getByTestId('mockSourceRuleSummaryFlyout')).toHaveAttribute(
        'data-has-rule',
        'false'
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
