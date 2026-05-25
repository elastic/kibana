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
import { useMatchedActionPolicies } from './use_matched_action_policies';

jest.mock('./use_matched_action_policies');

const mockUseMatchedActionPolicies = useMatchedActionPolicies as jest.MockedFunction<
  typeof useMatchedActionPolicies
>;

const renderComponent = (
  props?: Partial<React.ComponentProps<typeof LinkedActionPoliciesStep>>
) => {
  const http = httpServiceMock.createStartContract();
  return render(
    <IntlProvider locale="en">
      <LinkedActionPoliciesStep http={http} ruleId="rule-1" {...props} />
    </IntlProvider>
  );
};

describe('LinkedActionPoliciesStep', () => {
  it('shows a loading spinner while fetching', () => {
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: true, error: null, items: [] });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesLoading')).toBeInTheDocument();
  });

  it('shows an empty state when no policies match', () => {
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: false, error: null, items: [] });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesEmpty')).toBeInTheDocument();
  });

  it('renders policy names with category badges', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        {
          actionPolicy: { id: 'ap-1', name: 'Global Policy' } as any,
          category: 'global',
        },
        {
          actionPolicy: { id: 'ap-2', name: 'Tag Filtered Policy' } as any,
          category: 'global-filtered',
        },
        {
          actionPolicy: { id: 'ap-3', name: 'Direct Policy' } as any,
          category: 'direct',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('Global Policy')).toBeInTheDocument();
    expect(screen.getByText('Tag Filtered Policy')).toBeInTheDocument();
    expect(screen.getByText('Direct Policy')).toBeInTheDocument();
  });

  it('shows an error callout when the fetch fails', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: new Error('Network error'),
      items: [],
    });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesError')).toBeInTheDocument();
  });
});
