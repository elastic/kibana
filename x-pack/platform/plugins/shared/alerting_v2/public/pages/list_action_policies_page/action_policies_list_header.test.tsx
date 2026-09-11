/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ActionPoliciesListHeader } from './action_policies_list_header';

let mockPhase: 'initialLoad' | 'empty' | 'populated' | 'filtering' | 'filtered' = 'populated';

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    useContentListPhase: () => mockPhase,
  };
});

const onCreatePolicy = jest.fn();
const onCreateWithAgent = jest.fn();

const renderHeader = (props?: Partial<React.ComponentProps<typeof ActionPoliciesListHeader>>) =>
  render(
    <ListPageTestProviders>
      <ActionPoliciesListHeader
        canWrite={true}
        onCreatePolicy={onCreatePolicy}
        onCreateWithAgent={onCreateWithAgent}
        {...props}
      />
    </ListPageTestProviders>
  );

describe('ActionPoliciesListHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'populated';
  });

  it('renders the page title and experimental badge', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Action Policies');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('renders the create split button when the user can write and the list is populated', () => {
    renderHeader();

    expect(screen.getByTestId('createActionPolicyButton')).toBeInTheDocument();
    expect(screen.getByTestId('createActionPolicyButton-secondary-button')).toBeInTheDocument();
  });

  it('calls onCreatePolicy when the primary create button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(screen.getByTestId('createActionPolicyButton'));

    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('calls onCreateWithAgent from the split-button dropdown', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(screen.getByTestId('createActionPolicyButton-secondary-button'));
    await waitFor(() =>
      expect(screen.getByTestId('createActionPolicyWithAgentButton')).toBeInTheDocument()
    );
    await user.click(screen.getByTestId('createActionPolicyWithAgentButton'));

    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);
    expect(onCreatePolicy).not.toHaveBeenCalled();
  });

  it('disables the agent option (does not hide it) when createWithAgentDisabled is set', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader({
      createWithAgentDisabled: true,
      createWithAgentTooltipText: 'Missing privileges',
    });

    await user.click(screen.getByTestId('createActionPolicyButton-secondary-button'));
    await waitFor(() =>
      expect(screen.getByTestId('createActionPolicyWithAgentButton')).toBeInTheDocument()
    );

    const agentButton = screen.getByTestId('createActionPolicyWithAgentButton');
    expect(agentButton).toBeDisabled();

    fireEvent.click(agentButton);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('hides the create menu when the user cannot write', () => {
    renderHeader({ canWrite: false });

    expect(screen.queryByTestId('createActionPolicyButton')).toBeNull();
    expect(screen.queryByTestId('createActionPolicyButton-secondary-button')).toBeNull();
  });

  it('hides the create menu during the true empty state', () => {
    mockPhase = 'empty';
    renderHeader();

    expect(screen.queryByTestId('createActionPolicyButton')).toBeNull();
  });

  it('hides the create menu during initial load', () => {
    mockPhase = 'initialLoad';
    renderHeader();

    expect(screen.queryByTestId('createActionPolicyButton')).toBeNull();
  });
});
