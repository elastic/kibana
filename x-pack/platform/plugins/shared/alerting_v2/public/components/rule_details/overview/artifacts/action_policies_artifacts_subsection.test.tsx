/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import {
  ActionPoliciesArtifactsSubsection,
  LINKED_ACTION_POLICIES_VISIBLE_LIMIT,
} from './action_policies_artifacts_subsection';
import { RuleProvider } from '../../rule_context';
import type { RuleApiResponse } from '../../../../services/rules_api';

const mockUseLinkedActionPolicies = jest.fn();

jest.mock('./use_linked_action_policies', () => {
  const actual = jest.requireActual<typeof import('./use_linked_action_policies')>(
    './use_linked_action_policies'
  );

  return {
    ...actual,
    useLinkedActionPolicies: (...args: unknown[]) => mockUseLinkedActionPolicies(...args),
  };
});

jest.mock('../../../action_policy/details_flyout/action_policy_details_flyout_container', () => ({
  ActionPolicyDetailsFlyoutContainer: ({
    policyId,
    onClose,
  }: {
    policyId: string;
    onClose: () => void;
  }) => (
    <div data-test-subj="actionPolicyDetailsFlyoutMock">
      <span data-test-subj="actionPolicyDetailsFlyoutMockId">{policyId}</span>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const mockHttpService = {
  basePath: {
    prepend: (path: string) => path,
  },
};

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return mockHttpService;
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed' as const, base: 'FROM logs-*', breach: { segment: '' } },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

const buildItem = (
  category: MatchedActionPolicy['category'],
  overrides: Partial<MatchedActionPolicy['actionPolicy']> = {}
): MatchedActionPolicy => ({
  actionPolicy: {
    id: 'policy-1',
    name: 'Policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: null,
    group_by: null,
    tags: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    auth: { owner: 'user', created_by_user: true },
    created_by: 'user',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'user',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
  category,
});

const idleHookResult = {
  items: [] as MatchedActionPolicy[],
  isLoading: false,
  isError: false,
  isMatchTruncated: false,
  error: null,
};

const renderSubsection = (rule: RuleApiResponse = baseRule) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <ActionPoliciesArtifactsSubsection />
      </RuleProvider>
    </I18nProvider>
  );

describe('ActionPoliciesArtifactsSubsection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLinkedActionPolicies.mockReturnValue(idleHookResult);
  });

  it('loads linked policies for the current rule', () => {
    renderSubsection();
    expect(mockUseLinkedActionPolicies).toHaveBeenCalledWith('rule-1');
  });

  it('renders a loading spinner while policies are fetched', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      isLoading: true,
    });

    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsEmpty')).not.toBeInTheDocument();
  });

  it('renders an error prompt when loading fails', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      isError: true,
      error: new Error('boom'),
    });

    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsError')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsEmpty')).not.toBeInTheDocument();
  });

  it('renders an empty prompt when no policies match', () => {
    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsEmpty')).toBeInTheDocument();
    expect(screen.getByText('No matching action policies')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPolicyArtifactRow-policy-1')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('ruleActionPoliciesArtifactsTruncatedHint')
    ).not.toBeInTheDocument();
  });

  it('still shows the truncated hint when no evaluated policies match', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      isMatchTruncated: true,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPoliciesArtifactsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsTruncatedHint')).toHaveTextContent(
      'This space has more than 100 action policies, so this list may be incomplete.'
    );
  });

  it('lists matching and catch-all policies with distinct badges and an edit link', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [
        buildItem('global-filtered', { id: 'policy-match', name: 'Tag policy' }),
        buildItem('global', { id: 'policy-catch', name: 'Catch-all policy' }),
      ],
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-match')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPolicyArtifactName-policy-match')).toHaveTextContent(
      'Tag policy'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactCategory-policy-match')).toHaveTextContent(
      'Matching criteria'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactEditLink-policy-match')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies/edit/policy-match'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactEditLink-policy-match')).toHaveAttribute(
      'target',
      '_blank'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactEditLink-policy-match')).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );

    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-catch')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPolicyArtifactCategory-policy-catch')).toHaveTextContent(
      'Catch-all'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies'
    );
    expect(screen.getByText('Open action policies')).toBeInTheDocument();
  });

  it('opens the policy details flyout when a policy name is clicked', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [buildItem('global-filtered', { id: 'policy-match', name: 'Tag policy' })],
    });

    renderSubsection();

    expect(screen.queryByTestId('actionPolicyDetailsFlyoutMock')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ruleActionPolicyArtifactName-policy-match'));
    expect(screen.getByTestId('actionPolicyDetailsFlyoutMock')).toBeInTheDocument();
    expect(screen.getByTestId('actionPolicyDetailsFlyoutMockId')).toHaveTextContent('policy-match');

    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByTestId('actionPolicyDetailsFlyoutMock')).not.toBeInTheDocument();
  });

  it('shows disabled and snoozed badges when the policy would not fire', () => {
    const snoozedUntil = new Date(Date.now() + 60_000).toISOString();
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [
        buildItem('global', {
          id: 'policy-quiet',
          name: 'Quiet policy',
          enabled: false,
          snoozed_until: snoozedUntil,
        }),
      ],
    });

    renderSubsection();

    const disabledBadge = screen.getByTestId('ruleActionPolicyArtifactDisabledBadge-policy-quiet');
    const snoozedBadge = screen.getByTestId('ruleActionPolicyArtifactSnoozedBadge-policy-quiet');

    expect(disabledBadge).toHaveTextContent('Disabled');
    expect(snoozedBadge).toHaveTextContent('Snoozed');
    expect(disabledBadge.tagName).toBe(snoozedBadge.tagName);
  });

  it('caps the visible list and links to the remaining policies', () => {
    const items = Array.from({ length: LINKED_ACTION_POLICIES_VISIBLE_LIMIT + 2 }, (_, index) =>
      buildItem('global-filtered', {
        id: `policy-${index}`,
        name: `Policy ${index}`,
      })
    );

    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-0')).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `ruleActionPolicyArtifactRow-policy-${LINKED_ACTION_POLICIES_VISIBLE_LIMIT - 1}`
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `ruleActionPolicyArtifactRow-policy-${LINKED_ACTION_POLICIES_VISIBLE_LIMIT}`
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).toHaveTextContent(
      '2 more action policies'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies?ruleId=rule-1'
    );
  });

  it('does not label hidden catch-all overflow as matching policies', () => {
    const items = [
      ...Array.from({ length: LINKED_ACTION_POLICIES_VISIBLE_LIMIT }, (_, index) =>
        buildItem('global-filtered', {
          id: `match-${index}`,
          name: `Match ${index}`,
        })
      ),
      buildItem('global', { id: 'catch-hidden', name: 'Hidden catch-all' }),
    ];

    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items,
    });

    renderSubsection();

    expect(
      screen.queryByTestId('ruleActionPolicyArtifactRow-catch-hidden')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).toHaveTextContent(
      '1 more action policy'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies?ruleId=rule-1'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).not.toHaveTextContent(
      'matching'
    );
  });

  it('shows a truncated list hint when match results may be incomplete', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [buildItem('global-filtered', { id: 'policy-match', name: 'Tag policy' })],
      isMatchTruncated: true,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPoliciesArtifactsTruncatedHint')).toHaveTextContent(
      'This space has more than 100 action policies, so this list may be incomplete.'
    );
  });
});
