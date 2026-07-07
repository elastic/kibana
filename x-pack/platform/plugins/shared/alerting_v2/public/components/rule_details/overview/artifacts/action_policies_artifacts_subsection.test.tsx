/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesArtifactsSubsection } from './action_policies_artifacts_subsection';
import { RuleProvider } from '../../rule_context';
import type { RuleApiResponse } from '../../../../services/rules_api';

const mockUseLinkedActionPolicies = jest.fn();

jest.mock('./use_linked_action_policies', () => ({
  useLinkedActionPolicies: (...args: unknown[]) => mockUseLinkedActionPolicies(...args),
}));

jest.mock('../../../action_policy/action_policy_destinations_summary', () => ({
  ActionPolicyDestinationsSummary: () => (
    <div data-test-subj="actionPolicyDestinationsSummaryMock">destinations</div>
  ),
}));

jest.mock('../../../action_policy/details_flyout/action_policy_details_flyout_container', () => ({
  ActionPolicyDetailsFlyoutContainer: ({
    policyId,
    onClose,
  }: {
    policyId: string;
    onClose: () => void;
  }) => (
    <div data-test-subj={`actionPolicyDetailsFlyout-${policyId}`}>
      <button type="button" onClick={onClose}>
        Close flyout
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
  metadata: { name: 'Test Rule' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed' as const, base: 'FROM logs-*', breach: { segment: '' } },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const buildPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse =>
  ({
    id: 'policy-1',
    name: 'Notify on breach',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: 'rule.id: "rule-1"',
    groupBy: null,
    tags: null,
    groupingMode: 'per_episode',
    throttle: null,
    snoozedUntil: null,
    auth: { owner: 'user', createdByUser: true },
    createdBy: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'user',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ActionPolicyResponse);

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
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [],
      totalCount: 0,
      catchAllCount: 0,
      matchingCriteriaCount: 0,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('loads linked policies for the current rule', () => {
    renderSubsection();
    expect(mockUseLinkedActionPolicies).toHaveBeenCalledWith('rule-1');
  });

  it('renders loading state', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [],
      totalCount: 0,
      catchAllCount: 0,
      matchingCriteriaCount: 0,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsLoading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [],
      totalCount: 0,
      catchAllCount: 0,
      matchingCriteriaCount: 0,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });

    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsError')).toBeInTheDocument();
  });

  it('renders empty state when no policies are linked', () => {
    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsEmpty')).toBeInTheDocument();
    expect(screen.getByText('No action policies linked to this rule')).toBeInTheDocument();
  });

  it('renders stat, summary, manage link, and policy rows', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [
        buildPolicy({ id: 'policy-1', name: 'Catch all policy' }),
        buildPolicy({
          id: 'policy-2',
          name: 'Filtered policy',
          enabled: false,
        }),
      ],
      totalCount: 2,
      catchAllCount: 1,
      matchingCriteriaCount: 1,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPoliciesArtifactsStat')).toHaveTextContent('2');
    expect(screen.getByTestId('ruleActionPoliciesArtifactsSummary')).toHaveTextContent(
      '1 is matching criteria and 1 is catch-all'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsManageLink')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactName-policy-1')).toHaveTextContent(
      'Catch all policy'
    );
    expect(screen.getByTestId('ruleActionPolicyArtifactStatus-policy-2')).toHaveTextContent(
      'Disabled'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsHelp')).toBeInTheDocument();
  });

  it('renders snoozed status for enabled snoozed policies', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [
        buildPolicy({
          id: 'policy-snoozed',
          snoozedUntil: '2099-01-01T00:00:00.000Z',
        }),
      ],
      totalCount: 1,
      catchAllCount: 1,
      matchingCriteriaCount: 0,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPolicyArtifactStatus-policy-snoozed')).toHaveTextContent(
      'Snoozed'
    );
  });

  it('opens the policy details flyout when a policy name is clicked', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      policies: [buildPolicy()],
      totalCount: 1,
      catchAllCount: 1,
      matchingCriteriaCount: 0,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSubsection();

    fireEvent.click(screen.getByTestId('ruleActionPolicyArtifactName-policy-1'));
    expect(screen.getByTestId('actionPolicyDetailsFlyout-policy-1')).toBeInTheDocument();
  });
});
