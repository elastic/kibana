/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import {
  ActionPoliciesArtifactsSubsection,
  LINKED_ACTION_POLICIES_VISIBLE_LIMIT,
} from './action_policies_artifacts_subsection';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { createMockLocators, MockLocatorProvider } from '../../../../test_utils/test_providers';
import { AlertingV2ActionPoliciesLocatorDefinition } from '../../../../locators';

const mockLocators = createMockLocators();

const mockUseLinkedActionPolicies = jest.fn();
const mockUseActionPolicyConnectorTypes = jest.fn();

jest.mock('./use_linked_action_policies', () => ({
  useLinkedActionPolicies: (...args: unknown[]) => mockUseLinkedActionPolicies(...args),
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  ...jest.requireActual('@kbn/alerting-v2-rule-form'),
  useActionPolicyConnectorTypes: (...args: unknown[]) => mockUseActionPolicyConnectorTypes(...args),
}));

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

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1, tags: ['prod'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed' as const, base: 'FROM logs-*', breach: { segment: '' } },
  created_by: { profile_uid: 'alice@example.com' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'bob@example.com' },
  updated_at: '2026-03-04T12:00:00.000Z',
};

const buildItem = (
  category: MatchedActionPolicy['category'],
  overrides: Partial<MatchedActionPolicy['action_policy']> = {}
): MatchedActionPolicy => ({
  action_policy: {
    id: 'policy-1',
    name: 'Policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: null,
    group_by: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    created_by: { profile_uid: 'u_user' },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: { profile_uid: 'u_user' },
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
  category,
});

const idleHookResult = {
  items: [] as MatchedActionPolicy[],
  isLoading: false,
  isError: false,
  evaluatedCount: 0,
  isMatchTruncated: false,
  error: null,
};

const renderSubsection = (rule: RuleApiResponse = baseRule) =>
  render(
    <MockLocatorProvider locators={mockLocators}>
      <I18nProvider>
        <ActionPoliciesArtifactsSubsection rule={rule} />
      </I18nProvider>
    </MockLocatorProvider>
  );

describe('ActionPoliciesArtifactsSubsection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLinkedActionPolicies.mockReturnValue(idleHookResult);
    mockUseActionPolicyConnectorTypes.mockReturnValue({
      connectorTypesByPolicy: new Map(),
      isLoading: false,
    });
    jest
      .mocked(mockLocators.actionPolicyLocators.getRedirectUrl)
      .mockReturnValue('/mock-locator-url');
  });

  it('loads linked policies using the current rule tags', () => {
    renderSubsection();
    expect(mockUseLinkedActionPolicies).toHaveBeenCalledWith(['prod']);
  });

  it('loads linked policies with an empty tag list when the rule has none', () => {
    renderSubsection({
      ...baseRule,
      metadata: { name: 'Untagged Rule', version: 1 },
    });
    expect(mockUseLinkedActionPolicies).toHaveBeenCalledWith([]);
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
      evaluatedCount: 50,
      isMatchTruncated: true,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPoliciesArtifactsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsTruncatedHint')).toHaveTextContent(
      'Only 50 action policies were evaluated, so this list may be incomplete.'
    );
  });

  it('lists matching and catch-all policies with distinct badges', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [
        buildItem('tags', {
          id: 'policy-match',
          name: 'Tag policy',
          matcher: { tags: ['prod'] },
        }),
        buildItem('catch_all', { id: 'policy-catch', name: 'Catch-all policy' }),
      ],
    });

    renderSubsection();

    const { actionPolicyLocators } = mockLocators;
    expect(actionPolicyLocators.useUrl).toHaveBeenCalledWith({ page: 'list' });
    expect(actionPolicyLocators.getRedirectUrl).not.toHaveBeenCalled();

    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-match')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPolicyArtifactName-policy-match')).toHaveTextContent(
      'Tag policy'
    );
    expect(
      within(screen.getByTestId('ruleActionPolicyArtifactRow-policy-match')).getByTestId(
        'matchedPolicyReasonTags'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('ruleActionPolicyArtifactEditLink-policy-match')
    ).not.toBeInTheDocument();

    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-catch')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('ruleActionPolicyArtifactRow-policy-catch')).getByTestId(
        'matchedPolicyReasonCatchAll'
      )
    ).toHaveTextContent('Catch-all');
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'href',
      '/mock-locator-url'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'target',
      '_blank'
    );
    expect(screen.getByText('Open action policies')).toBeInTheDocument();
  });

  it('truncates policy names longer than 28 characters', () => {
    const name = 'Long matching policy for production hosts across every region and cluster';
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [buildItem('tags', { id: 'policy-long', name, matcher: { tags: ['prod'] } })],
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPolicyArtifactName-policy-long')).toHaveTextContent(
      'Long matching policy for pro...'
    );
    expect(screen.getByLabelText(`View details for ${name}`)).toBeInTheDocument();
  });

  it('shows a tag icon and an expression badge when the policy matches both ways', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [
        buildItem('tags', {
          id: 'policy-expr',
          name: 'Expression policy',
          matcher: { tags: ['prod'], expression: 'data.severity: "critical"' },
        }),
      ],
    });

    renderSubsection();

    const row = screen.getByTestId('ruleActionPolicyArtifactRow-policy-expr');
    const expression = within(row).getByTestId('matchedPolicyReasonExpression');
    const tags = within(row).getByTestId('matchedPolicyReasonTags');
    expect(expression).toHaveTextContent('Expression');
    expect(tags).toBeInTheDocument();
    expect(expression.compareDocumentPosition(tags)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows the same connector icons as the rule form', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [
        buildItem('tags', {
          id: 'policy-match',
          name: 'Tag policy',
          matcher: { tags: ['prod'] },
        }),
      ],
    });
    mockUseActionPolicyConnectorTypes.mockReturnValue({
      connectorTypesByPolicy: new Map([['policy-match', ['email', 'slack']]]),
      isLoading: false,
    });

    renderSubsection();

    const name = screen.getByTestId('ruleActionPolicyArtifactName-policy-match');
    const icons = screen.getByTestId('ruleActionPolicyArtifactConnectors-policy-match');
    expect(icons.querySelector('[data-euiicon-type="mail"]')).toBeInTheDocument();
    expect(icons.querySelector('[data-euiicon-type="logoSlack"]')).toBeInTheDocument();
    expect(name.compareDocumentPosition(icons)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('open link params resolve to management action policies list URL', async () => {
    renderSubsection();

    const [params] = jest.mocked(mockLocators.actionPolicyLocators.useUrl).mock.calls[0];
    const location = await AlertingV2ActionPoliciesLocatorDefinition.getLocation(params);
    expect(location).toMatchObject({
      app: 'management',
      path: '/alertingV2/action_policies',
    });
  });

  it('opens the policy details flyout when a policy name is clicked', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [buildItem('tags', { id: 'policy-match', name: 'Tag policy' })],
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
        buildItem('tags', {
          id: 'policy-quiet',
          name: 'Quiet policy',
          enabled: false,
          snoozed_until: snoozedUntil,
          matcher: { tags: ['prod'] },
        }),
      ],
    });

    renderSubsection();

    const row = screen.getByTestId('ruleActionPolicyArtifactRow-policy-quiet');
    const disabled = within(row).getByTestId('ruleActionPolicyArtifactDisabledBadge-policy-quiet');
    const snoozed = within(row).getByTestId('ruleActionPolicyArtifactSnoozedBadge-policy-quiet');
    const tags = within(row).getByTestId('matchedPolicyReasonTags');

    expect(disabled).toHaveTextContent('Disabled');
    expect(disabled.querySelector('[data-euiicon-type]')).not.toBeInTheDocument();
    expect(snoozed).toHaveAttribute('aria-label', 'Snoozed');
    expect(snoozed.querySelector('[data-euiicon-type="bellSlash"]')).toBeInTheDocument();
    expect(disabled.compareDocumentPosition(snoozed)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(snoozed.compareDocumentPosition(tags)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('caps the visible list and expands remaining policies in place', () => {
    const items = Array.from({ length: LINKED_ACTION_POLICIES_VISIBLE_LIMIT + 2 }, (_, index) =>
      buildItem('tags', {
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

    fireEvent.click(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink'));

    expect(
      screen.getByTestId(
        `ruleActionPolicyArtifactRow-policy-${LINKED_ACTION_POLICIES_VISIBLE_LIMIT}`
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPolicyArtifactRow-policy-9')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsViewMoreLink')).not.toBeInTheDocument();
  });

  it('does not label hidden catch-all overflow as matching policies', () => {
    const items = [
      ...Array.from({ length: LINKED_ACTION_POLICIES_VISIBLE_LIMIT }, (_, index) =>
        buildItem('tags', {
          id: `match-${index}`,
          name: `Match ${index}`,
        })
      ),
      buildItem('catch_all', { id: 'catch-hidden', name: 'Hidden catch-all' }),
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
    expect(screen.getByTestId('ruleActionPoliciesArtifactsViewMoreLink')).not.toHaveTextContent(
      'matching'
    );
  });

  it('shows a truncated list hint when match results may be incomplete', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      ...idleHookResult,
      items: [buildItem('tags', { id: 'policy-match', name: 'Tag policy' })],
      evaluatedCount: 50,
      isMatchTruncated: true,
    });

    renderSubsection();

    expect(screen.getByTestId('ruleActionPoliciesArtifactsTruncatedHint')).toHaveTextContent(
      'Only 50 action policies were evaluated, so this list may be incomplete.'
    );
  });
});
