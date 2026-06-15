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
      <LinkedActionPoliciesStep http={http} ruleId="rule-1" {...props} />
    </IntlProvider>
  );
};

describe('LinkedActionPoliciesStep', () => {
  it('always renders the title and subtext', () => {
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: false, error: null, items: [] });

    renderComponent();

    expect(screen.getByText('Action policies')).toBeInTheDocument();
    expect(screen.getByText('These policies currently match this rule.')).toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: true, error: null, items: [] });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesLoading')).toBeInTheDocument();
  });

  it('shows an empty state when no policies match', () => {
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: false, error: null, items: [] });

    renderComponent();

    expect(screen.getByTestId('linkedActionPoliciesEmpty')).toBeInTheDocument();
    expect(screen.getByText('0 matching action policies')).toBeInTheDocument();
  });

  it('renders policy names with category badges in an EuiSelectable', () => {
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
    expect(screen.getByText('Global policies')).toBeInTheDocument();
    expect(screen.getByText('Matching global policies')).toBeInTheDocument();
    expect(screen.getByText('Linked policies')).toBeInTheDocument();
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

  it('passes name and tags from form values when ruleId is not provided', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: false, error: null, items: [] });

    renderComponent({ ruleId: undefined });

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: undefined, name: 'My Rule', tags: ['env:prod'] })
    );
  });

  it('passes current form name and tags alongside ruleId so unsaved changes are reflected', () => {
    mockUseWatch.mockReturnValue({ name: 'My Rule', tags: ['env:prod'] });
    mockUseMatchedActionPolicies.mockReturnValue({ isLoading: false, error: null, items: [] });

    renderComponent({ ruleId: 'rule-abc' });

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'rule-abc', name: 'My Rule', tags: ['env:prod'] })
    );
  });
});
