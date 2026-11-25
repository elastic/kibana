/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapabilitiesSection } from './capabilities_section';

const baseProps = {
  skillsCount: 2,
  pluginsCount: 0,
  toolsCount: 2,
  skillsCountLoading: false,
  pluginsCountLoading: false,
  toolsCountLoading: false,
  enableElasticCapabilities: false,
  skillsHref: '/agents/a/skills',
  pluginsHref: '/agents/a/plugins',
  toolsHref: '/agents/a/tools',
  connectorsCount: 0,
  hasConnectorsPrivileges: true,
  connectorsHref: '/agents/a/connectors',
  onNavigateToSkills: jest.fn(),
  onNavigateToPlugins: jest.fn(),
  onNavigateToTools: jest.fn(),
  onNavigateToConnectors: jest.fn(),
};

describe('CapabilitiesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Skills, Plugins, and Tools cards when experimental features are enabled', () => {
    render(<CapabilitiesSection {...baseProps} isExperimentalFeaturesEnabled={true} />);

    expect(screen.getByTestId('agentOverviewCapabilityCardSkills')).toBeInTheDocument();
    expect(screen.getByTestId('agentOverviewCapabilityCardPlugins')).toBeInTheDocument();
    expect(screen.getByTestId('agentOverviewCapabilityCardTools')).toBeInTheDocument();
  });

  it('omits the Plugins card when experimental features are disabled, but keeps Connectors', () => {
    render(<CapabilitiesSection {...baseProps} isExperimentalFeaturesEnabled={false} />);

    expect(screen.getByTestId('agentOverviewCapabilityCardSkills')).toBeInTheDocument();
    expect(screen.queryByTestId('agentOverviewCapabilityCardPlugins')).not.toBeInTheDocument();
    expect(screen.getByTestId('agentOverviewCapabilityCardConnectors')).toBeInTheDocument();
    expect(screen.getByTestId('agentOverviewCapabilityCardTools')).toBeInTheDocument();
  });

  it('renders the Connectors card when experimental features are enabled', () => {
    render(<CapabilitiesSection {...baseProps} isExperimentalFeaturesEnabled={true} />);

    expect(screen.getByTestId('agentOverviewCapabilityCardConnectors')).toBeInTheDocument();
  });

  it('fires navigation handlers when non-loading cards are clicked', async () => {
    const user = userEvent.setup();
    const onNavigateToSkills = jest.fn();
    const onNavigateToTools = jest.fn();
    const onNavigateToConnectors = jest.fn();

    render(
      <CapabilitiesSection
        {...baseProps}
        isExperimentalFeaturesEnabled={false}
        onNavigateToSkills={onNavigateToSkills}
        onNavigateToTools={onNavigateToTools}
        onNavigateToConnectors={onNavigateToConnectors}
      />
    );

    await user.click(screen.getByTestId('agentOverviewCapabilityCardSkills'));
    expect(onNavigateToSkills).toHaveBeenCalled();

    await user.click(screen.getByTestId('agentOverviewCapabilityCardTools'));
    expect(onNavigateToTools).toHaveBeenCalled();

    await user.click(screen.getByTestId('agentOverviewCapabilityCardConnectors'));
    expect(onNavigateToConnectors).toHaveBeenCalled();
  });

  it("does not navigate when the Connectors card's technical-preview badge is clicked", async () => {
    const user = userEvent.setup();
    const onNavigateToConnectors = jest.fn();

    render(
      <CapabilitiesSection
        {...baseProps}
        isExperimentalFeaturesEnabled={false}
        onNavigateToConnectors={onNavigateToConnectors}
      />
    );

    await user.click(screen.getByText('Technical preview'));
    expect(onNavigateToConnectors).not.toHaveBeenCalled();
  });
});
