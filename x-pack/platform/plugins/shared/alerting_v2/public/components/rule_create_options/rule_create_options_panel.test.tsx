/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleBuilderCreateOptionItem } from '@kbn/alerting-v2-rule-form';
import { RuleCreateOptionsPanel, getCreateWithAgentTooltipText } from './rule_create_options_panel';

const onCreateEsqlRule = jest.fn();
const onCreateWithAgent = jest.fn();
const onCreateBuilderRule = jest.fn();

/** Two builders, so the panel is exercised as a list rather than a single card. */
const builderOptions: RuleBuilderCreateOptionItem[] = [
  {
    type: 'threshold',
    title: 'Threshold rule',
    description: 'Monitor metrics against thresholds.',
    iconType: 'chartThreshold',
    order: 10,
  },
  {
    type: 'anomaly',
    title: 'Anomaly rule',
    description: 'Detect anomalies in a metric.',
    iconType: 'machineLearningApp',
    order: 20,
  },
];

const renderPanel = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPanel
        onCreateEsqlRule={onCreateEsqlRule}
        onCreateWithAgent={onCreateWithAgent}
        builderOptions={builderOptions}
        onCreateBuilderRule={onCreateBuilderRule}
      />
    </I18nProvider>
  );

describe('RuleCreateOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty state title', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { level: 2, name: /no rules yet\. let's get started!/i })
    ).toBeInTheDocument();
  });

  it('calls onCreateEsqlRule when the "Create ES|QL rule" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createEsqlRuleCard'));

    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateWithAgent when the "Create with AI Agent" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createWithAgentCard'));

    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);
  });

  it('renders the rule builder divider between the second and third options', () => {
    renderPanel();

    expect(screen.getByText('or start from a builder')).toBeInTheDocument();
    expect(screen.queryByText('Start from a rule builder')).not.toBeInTheDocument();
  });

  it('renders a card for every registered builder', () => {
    renderPanel();

    expect(screen.getByText('Threshold rule')).toBeInTheDocument();
    expect(screen.getByText('Anomaly rule')).toBeInTheDocument();
  });

  it('reports which builder was chosen, so a new builder needs no changes here', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('createAnomalyRuleCard'));

    expect(onCreateBuilderRule).toHaveBeenCalledWith('anomaly');
  });

  // Asserted explicitly because the Scout page object locates this card by subject.
  it('keeps the threshold card on its established test subject', () => {
    renderPanel();

    expect(screen.getByTestId('createThresholdRuleCard')).toBeInTheDocument();
  });

  it('omits the builder section entirely when no builders are registered', () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          builderOptions={[]}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    expect(screen.queryByText('or start from a builder')).not.toBeInTheDocument();
    expect(screen.queryByText('Threshold rule')).not.toBeInTheDocument();
  });

  it('renders the agent card disabled and does not fire onCreateWithAgent when createWithAgentDisabled is set', () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentDisabled
          createWithAgentTooltipText="Missing privileges"
          builderOptions={builderOptions}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).toBeInTheDocument();
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('shows the tooltip text on hover regardless of the disabled state', async () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentDisabled
          createWithAgentTooltipText="Missing privileges"
          builderOptions={builderOptions}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    fireEvent.mouseOver(screen.getByTestId('createWithAgentCard'));

    expect(await screen.findByText('Missing privileges')).toBeInTheDocument();
  });

  it('renders the agent card disabled and shows the tooltip on hover in the vertical (flyout) layout', async () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          layout="vertical"
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentDisabled
          createWithAgentTooltipText="Missing privileges"
          builderOptions={builderOptions}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('button', { name: /create with ai agent/i }));
    expect(onCreateWithAgent).not.toHaveBeenCalled();

    fireEvent.mouseOver(agentCard);
    expect(await screen.findByText('Missing privileges')).toBeInTheDocument();
  });

  it('disables the agent card without a tooltip when createWithAgentDisabled is set alone', () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentDisabled
          builderOptions={builderOptions}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('shows a tooltip without disabling the agent card when only createWithAgentTooltipText is set', async () => {
    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentTooltipText="Extra context"
          builderOptions={builderOptions}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    const agentCard = screen.getByTestId('createWithAgentCard');
    expect(agentCard).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);

    fireEvent.mouseOver(agentCard);
    expect(await screen.findByText('Extra context')).toBeInTheDocument();
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
