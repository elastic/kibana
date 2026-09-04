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

jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useWatch: jest.fn().mockReturnValue({ name: '', tags: [] }),
}));

jest.mock('./use_matched_action_policies');

const mockUseMatchedActionPolicies = useMatchedActionPolicies as jest.MockedFunction<
  typeof useMatchedActionPolicies
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
  it('renders the title and the matching subtext when policies are present', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        {
          actionPolicy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch-all',
        },
      ],
      total: 1,
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
      error: null,
      items: [],
      total: 0,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesLoading')).toBeInTheDocument();
  });

  it('shows an empty state when no policies match', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      total: 0,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesEmpty')).toBeInTheDocument();
    expect(screen.getByText('No matching action policies found.')).toBeInTheDocument();
  });

  it('renders a catch-all badge for a global policy', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        {
          actionPolicy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch-all',
        },
      ],
      total: 1,
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
      error: null,
      items: [
        {
          actionPolicy: {
            id: 'ap-2',
            name: 'Tag Policy',
            matcher: { tags: ['env:prod', 'team:sre'] },
          } as any,
          category: 'tags',
        },
      ],
      total: 1,
    });

    renderComponent();

    expect(screen.getByTestId('matchedPolicyReasonTags')).toBeInTheDocument();
    expect(screen.getByText('Tags (1)')).toBeInTheDocument();
    expect(screen.queryByTestId('matchedPolicyReasonCatchAll')).not.toBeInTheDocument();
  });

  it('renders both tags and expression badges when the matcher has both clauses', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        {
          actionPolicy: {
            id: 'ap-4',
            name: 'Combined Policy',
            matcher: { tags: ['env:prod'], expression: 'data.error_count > 0' },
          } as any,
          category: 'tags',
        },
      ],
      total: 1,
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
      error: null,
      items: [
        {
          actionPolicy: { id: 'ap-1', name: 'Global Policy', matcher: null } as any,
          category: 'catch-all',
        },
      ],
      total: 1,
    });

    render(
      <IntlProvider locale="en">
        <LinkedActionPoliciesStep http={http} />
      </IntlProvider>
    );

    const editBtn = screen.getByTestId('linkedActionPolicyEdit-ap-1');
    expect(editBtn).toBeInTheDocument();
    expect(editBtn).toHaveAttribute('href', '/app/management/alertingV2/action_policies/edit/ap-1');
    expect(editBtn).toHaveAttribute('target', '_blank');
  });

  it('shows an error callout when the fetch fails', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: new Error('Network error'),
      items: [],
      total: 0,
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesError')).toBeInTheDocument();
  });

  it('passes the current form tags to the matcher hook so unsaved changes are reflected', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      total: 0,
    });

    renderComponent();

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['env:prod'] })
    );
  });
});
