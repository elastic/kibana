/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { LinkedActionPoliciesStep } from './linked_action_policies_step';
import { useWatch } from 'react-hook-form';
import { useMatchedActionPolicies } from './use_matched_action_policies';
import { useActionPolicyConnectorTypes } from './use_action_policy_connector_types';

jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useWatch: jest.fn().mockReturnValue({ name: '', tags: [] }),
}));

jest.mock('./use_matched_action_policies');
jest.mock('./use_action_policy_connector_types');

const mockUseMatchedActionPolicies = useMatchedActionPolicies as jest.MockedFunction<
  typeof useMatchedActionPolicies
>;

const mockUseActionPolicyConnectorTypes = useActionPolicyConnectorTypes as jest.MockedFunction<
  typeof useActionPolicyConnectorTypes
>;

const mockUseWatch = useWatch as jest.Mock;

const renderComponent = (
  props?: Partial<React.ComponentProps<typeof LinkedActionPoliciesStep>>
) => {
  const http = httpServiceMock.createStartContract();
  return render(
    <IntlProvider locale="en">
      <LinkedActionPoliciesStep http={http} {...props} />
    </IntlProvider>
  );
};

describe('LinkedActionPoliciesStep', () => {
  beforeEach(() => {
    mockUseActionPolicyConnectorTypes.mockReturnValue({
      connectorTypesByPolicy: new Map(),
      isLoading: false,
    });
  });

  it('renders the title and the matching subtext when policies are present', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch_all',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByText('Action policies')).toBeInTheDocument();
    expect(
      screen.getByText(
        'These policies match this rule by catch-all or tag. Policies with a query condition may also match at dispatch time based on alert data.'
      )
    ).toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: true,
      isPreviousData: false,
      error: null,
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesLoading')).toBeInTheDocument();
  });

  it('shows an empty state when no policies match', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesEmpty')).toBeInTheDocument();
    expect(screen.getByText('No matching action policies found.')).toBeInTheDocument();
  });

  it('renders a catch-all badge for a global policy', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch_all',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByText('Global Policy')).toBeInTheDocument();
    expect(screen.getByTestId('matchedPolicyReasonCatchAll')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonTags')).not.toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonExpression')).not.toBeInTheDocument();
  });

  it('renders a tags badge for a policy matched by tags', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod', 'other'] });
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: {
            id: 'ap-2',
            name: 'Tag Policy',
            matcher: { tags: ['env:prod', 'team:sre'] },
          } as any,
          category: 'tags',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByTestId('matchedPolicyReasonTags')).toBeInTheDocument();
    expect(screen.getByTestId('matchedPolicyReasonTags')).toHaveAttribute(
      'aria-label',
      'Matching rule tags: env:prod'
    );
    expect(screen.queryByTestId('matchedPolicyReasonCatchAll')).not.toBeInTheDocument();
  });

  it('renders both tags and expression badges when the matcher has both clauses', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: {
            id: 'ap-4',
            name: 'Combined Policy',
            matcher: { tags: ['env:prod'], expression: 'data.error_count > 0' },
          } as any,
          category: 'tags',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByTestId('matchedPolicyReasonTags')).toBeInTheDocument();
    expect(screen.getByTestId('matchedPolicyReasonExpression')).toBeInTheDocument();
  });

  it('renders the edit link for each policy row with the correct href', () => {
    const http = httpServiceMock.createStartContract();
    // createStartContract uses a real BasePath instance with basePath='', so prepend() is a pass-through.

    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch_all',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    render(
      <IntlProvider locale="en">
        <LinkedActionPoliciesStep http={http} />
      </IntlProvider>
    );

    const editLink = screen.getByTestId('linkedActionPolicyEdit-ap-1');
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveTextContent('Global Policy');
    expect(editLink).toHaveAttribute(
      'href',
      '/app/management/alertingV2/action_policies/edit/ap-1'
    );
    expect(editLink).toHaveAttribute('target', '_blank');
    expect(editLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders connector icons for a policy from the batched connector-types hook', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: {
            id: 'ap-1',
            name: 'Global Policy',
            matcher: null,
            destinations: [{ type: 'workflow', id: 'wf-1' }],
          } as any,
          category: 'catch_all',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });
    mockUseActionPolicyConnectorTypes.mockReturnValue({
      connectorTypesByPolicy: new Map([['ap-1', ['email', 'slack']]]),
      isLoading: false,
    });

    renderComponent();

    expect(mockUseActionPolicyConnectorTypes).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'ap-1' }),
    ]);
    expect(screen.getByTestId('linkedActionPolicyConnectorIcons-ap-1')).toBeInTheDocument();
  });

  it('does not render a connector-icons row when the policy has no connector types', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [
        {
          action_policy: {
            id: 'ap-1',
            name: 'Global Policy',
            matcher: null,
            destinations: [],
          } as any,
          category: 'catch_all',
        },
      ],
      evaluatedCount: 1,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.queryByTestId('linkedActionPolicyConnectorIcons-ap-1')).not.toBeInTheDocument();
  });

  it('shows an error callout when the fetch fails', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: new Error('Network error'),
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesError')).toBeInTheDocument();
  });

  it('passes the current form tags to the matcher hook so unsaved changes are reflected', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: false,
      error: null,
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    renderComponent();

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['env:prod'] })
    );
  });
});
