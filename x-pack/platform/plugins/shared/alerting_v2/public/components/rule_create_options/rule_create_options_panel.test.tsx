/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateOptionsPanel, getCreateWithAgentTooltipText } from './rule_create_options_panel';

let mockAreAgentBuilderSkillsAvailable = true;
let mockAgentBuilderSkillsRequirements = {
  hasAgentBuilderCapability: true,
  isExperimentalFeaturesEnabled: true,
};

jest.mock('../../hooks/use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements: () => mockAgentBuilderSkillsRequirements,
}));

const onCreateEsqlRule = jest.fn();
const onCreateWithAgent = jest.fn();
const onCreateThresholdRule = jest.fn();

const renderPanel = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPanel
        onCreateEsqlRule={onCreateEsqlRule}
        onCreateWithAgent={onCreateWithAgent}
        onCreateThresholdRule={onCreateThresholdRule}
      />
    </I18nProvider>
  );

describe('RuleCreateOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreAgentBuilderSkillsAvailable = true;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: true,
      isExperimentalFeaturesEnabled: true,
    };
  });

  it('renders the empty state title', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { level: 2, name: /no rules yet\. let's get started!/i })
    ).toBeInTheDocument();
  });

  it('calls onCreateEsqlRule when the "ES|QL rule" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createEsqlRuleCard'));

    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateWithAgent when the "With AI Agent" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createWithAgentCard'));

    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);
  });

  it('renders the rule builder divider between the second and third options', () => {
    renderPanel();

    expect(screen.getByText('or start from a builder')).toBeInTheDocument();
    expect(screen.queryByText('Start from a rule builder')).not.toBeInTheDocument();
  });

  it('renders the "Threshold rule" card', () => {
    renderPanel();

    expect(screen.getByText('Threshold rule')).toBeInTheDocument();
  });

  it('calls onCreateThresholdRule when the "Threshold rule" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createThresholdRuleCard'));

    expect(onCreateThresholdRule).toHaveBeenCalledTimes(1);
  });

  it('renders the agent card disabled and does not fire onCreateWithAgent when agent builder is unavailable', () => {
    mockAreAgentBuilderSkillsAvailable = false;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    };
    renderPanel();

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).toBeInTheDocument();
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('shows the missing-prerequisite tooltip on hover', async () => {
    mockAreAgentBuilderSkillsAvailable = false;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    };
    renderPanel();

    fireEvent.mouseOver(screen.getByTestId('createWithAgentCard'));

    expect(await screen.findByText(/Agent Builder: Read/)).toBeInTheDocument();
  });

  it('renders the agent card disabled and shows the tooltip on hover in the vertical (flyout) layout', async () => {
    mockAreAgentBuilderSkillsAvailable = false;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    };
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          layout="vertical"
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          onCreateThresholdRule={onCreateThresholdRule}
        />
      </I18nProvider>
    );

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('button', { name: /with ai agent/i }));
    expect(onCreateWithAgent).not.toHaveBeenCalled();

    fireEvent.mouseOver(agentCard);
    expect(await screen.findByText(/Agent Builder: Read/)).toBeInTheDocument();
  });
});

describe('getCreateWithAgentTooltipText', () => {
  it('returns undefined when both prerequisites are met', () => {
    expect(
      getCreateWithAgentTooltipText({
        hasAgentBuilderCapability: true,
        isExperimentalFeaturesEnabled: true,
      })
    ).toBeUndefined();
  });

  it('names only the privilege when only the capability is missing', () => {
    const tooltip = getCreateWithAgentTooltipText({
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    });

    expect(tooltip).toContain('Agent Builder: Read');
    expect(tooltip).not.toContain('advanced setting');
  });

  it('names only the advanced setting when only the experimental feature is missing', () => {
    const tooltip = getCreateWithAgentTooltipText({
      hasAgentBuilderCapability: true,
      isExperimentalFeaturesEnabled: false,
    });

    expect(tooltip).toContain('Elastic Agent Builder: Experimental Features');
    expect(tooltip).toContain('advanced setting');
    expect(tooltip).not.toContain('Agent Builder: Read');
  });

  it('names both prerequisites when neither is met', () => {
    const tooltip = getCreateWithAgentTooltipText({
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: false,
    });

    expect(tooltip).toContain('Agent Builder: Read');
    expect(tooltip).toContain('Elastic Agent Builder: Experimental Features');
  });
});
