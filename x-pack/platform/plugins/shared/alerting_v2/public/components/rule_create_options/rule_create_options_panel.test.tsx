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
};

jest.mock('../../hooks/use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements: () => mockAgentBuilderSkillsRequirements,
}));

const onCreateEsqlRule = jest.fn();
const onCreateWithAgent = jest.fn();
const onCreateThresholdRule = jest.fn();
const onBuildSequence = jest.fn();

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
    };
  });

  it('renders the empty state title', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /no universal rules yet\. let's get started!/i,
      })
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

  it('renders the agent card without an experimental badge', () => {
    renderPanel();

    expect(screen.getByTestId('createWithAgentCard')).toBeInTheDocument();
    expect(screen.queryByTestId('createWithAgentExperimentalBadge')).not.toBeInTheDocument();
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
    };
    renderPanel();

    fireEvent.mouseOver(screen.getByTestId('createWithAgentCard'));

    expect(await screen.findByText(/Agent Builder: Read/)).toBeInTheDocument();
  });

  it('renders the agent card disabled and shows the tooltip on hover in the vertical (flyout) layout', async () => {
    mockAreAgentBuilderSkillsAvailable = false;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: false,
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

  describe('vertical (flyout) layout sequence card', () => {
    const renderVertical = (withSequence: boolean) =>
      render(
        <I18nProvider>
          <RuleCreateOptionsPanel
            layout="vertical"
            onCreateEsqlRule={onCreateEsqlRule}
            onCreateWithAgent={onCreateWithAgent}
            onCreateThresholdRule={onCreateThresholdRule}
            onBuildSequence={withSequence ? onBuildSequence : undefined}
          />
        </I18nProvider>
      );

    it('renders the card with an Experimental badge and calls onBuildSequence on click', () => {
      renderVertical(true);

      expect(screen.getByTestId('createSequenceRuleExperimentalBadge')).toHaveTextContent(
        'Experimental'
      );
      fireEvent.click(screen.getByTestId('createSequenceRuleCard'));

      expect(onBuildSequence).toHaveBeenCalledTimes(1);
    });

    it('does not render the card when onBuildSequence is not provided', () => {
      renderVertical(false);

      expect(screen.queryByTestId('createSequenceRuleCard')).not.toBeInTheDocument();
    });
  });
});

describe('getCreateWithAgentTooltipText', () => {
  it('returns undefined when the agent builder capability is present', () => {
    expect(
      getCreateWithAgentTooltipText({
        hasAgentBuilderCapability: true,
      })
    ).toBeUndefined();
  });

  it('names the privilege when the capability is missing', () => {
    const tooltip = getCreateWithAgentTooltipText({
      hasAgentBuilderCapability: false,
    });

    expect(tooltip).toContain('Agent Builder: Read');
    expect(tooltip).not.toContain('advanced setting');
  });
});
