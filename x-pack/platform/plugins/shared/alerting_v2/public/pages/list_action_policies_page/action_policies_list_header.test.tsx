/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ActionPoliciesListHeader } from './action_policies_list_header';

let mockPhase: 'initialLoad' | 'empty' | 'populated' | 'filtering' | 'filtered' = 'populated';
let mockExperimentalFeaturesEnabled = true;
let mockAreAgentBuilderSkillsAvailable = true;
let mockAgentBuilderSkillsRequirements = {
  hasAgentBuilderCapability: true,
  isExperimentalFeaturesEnabled: true,
};
let mockIsLicenseValid = true;

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    useContentListPhase: () => mockPhase,
  };
});

jest.mock('../../hooks/use_alerting_v2_experimental_features', () => ({
  useAlertingV2ExperimentalFeatures: () => mockExperimentalFeaturesEnabled,
}));

jest.mock('../../hooks/use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements: () => mockAgentBuilderSkillsRequirements,
}));

jest.mock('../../hooks/use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: () => ({ capabilities: {}, getUrlForApp: jest.fn() }),
}));

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
    mockExperimentalFeaturesEnabled = true;
    mockAreAgentBuilderSkillsAvailable = true;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: true,
      isExperimentalFeaturesEnabled: true,
    };
    mockIsLicenseValid = true;
  });

  it('renders the create split button when the user can write and the list is populated', async () => {
    renderHeader();

    expect(await screen.findByTestId('createActionPolicyButton')).toBeInTheDocument();
    expect(
      await screen.findByTestId('createActionPolicyButton-secondary-button')
    ).toBeInTheDocument();
  });

  it('hides the create-with-agent menu when experimental features are disabled', async () => {
    mockExperimentalFeaturesEnabled = false;
    renderHeader();

    expect(await screen.findByTestId('createActionPolicyButton')).toBeInTheDocument();
    expect(screen.queryByTestId('createActionPolicyButton-secondary-button')).toBeNull();
    expect(screen.queryByTestId('createActionPolicyWithAgentButton')).toBeNull();
  });

  it('calls onCreatePolicy when the primary create button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(await screen.findByTestId('createActionPolicyButton'));

    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('calls onCreateWithAgent from the split-button dropdown', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(await screen.findByTestId('createActionPolicyButton-secondary-button'));
    const agentButton = await screen.findByTestId('createActionPolicyWithAgentButton');
    agentButton.focus();
    await user.keyboard('{Enter}');

    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);
    expect(onCreatePolicy).not.toHaveBeenCalled();
  });

  it('disables the agent option (does not hide it) when agent builder is unavailable', async () => {
    const user = userEvent.setup({ delay: null });
    mockAreAgentBuilderSkillsAvailable = false;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    };
    renderHeader();

    await user.click(await screen.findByTestId('createActionPolicyButton-secondary-button'));
    const agentButton = await screen.findByTestId('createActionPolicyWithAgentButton');
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

  describe('license gating', () => {
    it('does not render the license callout when the license is valid', () => {
      renderHeader();

      expect(screen.queryByTestId('actionPoliciesLicenseCallout')).toBeNull();
      expect(screen.getByTestId('createActionPolicyButton')).toBeEnabled();
    });

    it('disables the create split button and renders the license callout when the license is not valid', () => {
      mockIsLicenseValid = false;
      renderHeader();

      expect(screen.getByTestId('createActionPolicyButton')).toBeDisabled();
      expect(screen.getByTestId('createActionPolicyButton-secondary-button')).toBeDisabled();
      expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();
    });

    it('renders the license callout in the empty state, where the header menu is hidden', () => {
      mockIsLicenseValid = false;
      mockPhase = 'empty';
      renderHeader();

      expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();
    });

    it('does not render the license callout when the user cannot write', () => {
      mockIsLicenseValid = false;
      renderHeader({ canWrite: false });

      expect(screen.queryByTestId('actionPoliciesLicenseCallout')).toBeNull();
    });
  });
});
