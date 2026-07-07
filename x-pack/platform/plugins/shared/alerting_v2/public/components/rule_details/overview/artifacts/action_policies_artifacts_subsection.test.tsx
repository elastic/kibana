/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionPoliciesArtifactsSubsection } from './action_policies_artifacts_subsection';
import { RuleProvider } from '../../rule_context';
import type { RuleApiResponse } from '../../../../services/rules_api';

const mockUseLinkedActionPolicies = jest.fn();

jest.mock('./use_linked_action_policies', () => ({
  useLinkedActionPolicies: (...args: unknown[]) => mockUseLinkedActionPolicies(...args),
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

  it('renders loading state on the stat', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      totalCount: 0,
      catchAllCount: 0,
      matchingCriteriaCount: 0,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsStat')).toBeInTheDocument();
  });

  it('hides the stat when loading fails', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
      totalCount: 0,
      catchAllCount: 0,
      matchingCriteriaCount: 0,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });

    renderSubsection();
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsStat')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsError')).toBeInTheDocument();
  });

  it('renders zero count without a separate empty prompt', () => {
    renderSubsection();
    expect(screen.getByTestId('ruleActionPoliciesArtifactsStat')).toHaveTextContent('0');
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPoliciesArtifactsSummary')).not.toBeInTheDocument();
  });

  it('renders stat, summary, and open link without listing individual policies', () => {
    mockUseLinkedActionPolicies.mockReturnValue({
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
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'target',
      '_blank'
    );
    expect(screen.getByTestId('ruleActionPoliciesArtifactsOpenLink')).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
    expect(screen.getByText('Open notification policies')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleActionPolicyArtifactRow-policy-1')).not.toBeInTheDocument();
  });
});
