/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  ActionPolicyCreateOptionsPanel,
  getCreateActionPolicyWithAgentTooltipText,
  type ActionPolicyCreateOption,
} from './action_policy_create_options_panel';

const onCreatePolicy = jest.fn();
const onCreateWithAgent = jest.fn();

const createPolicyOption = (
  overrides: Partial<ActionPolicyCreateOption> = {}
): ActionPolicyCreateOption => ({
  id: 'create-policy',
  iconType: 'workflow',
  title: 'Create policy',
  description: 'Match alert episodes and send them to destinations.',
  onClick: onCreatePolicy,
  'data-test-subj': 'createActionPolicyCard',
  ...overrides,
});

const createWithAgentOption = (
  overrides: Partial<ActionPolicyCreateOption> = {}
): ActionPolicyCreateOption => ({
  id: 'create-with-agent',
  iconType: 'productAgent',
  title: 'Create with AI Agent',
  description: 'Set up an action policy with the help of the AI Agent.',
  onClick: onCreateWithAgent,
  'data-test-subj': 'createActionPolicyWithAgentCard',
  ...overrides,
});

const renderPanel = (options: ActionPolicyCreateOption[]) =>
  render(
    <I18nProvider>
      <ActionPolicyCreateOptionsPanel options={options} />
    </I18nProvider>
  );

describe('ActionPolicyCreateOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty state title', () => {
    renderPanel([createPolicyOption(), createWithAgentOption()]);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /no action policies yet\. let's get started!/i,
      })
    ).toBeInTheDocument();
  });

  it('renders each configured option', () => {
    renderPanel([
      createPolicyOption(),
      createWithAgentOption(),
      {
        id: 'extra',
        iconType: 'plus',
        title: 'Extra option',
        description: 'Configured by the caller.',
        onClick: jest.fn(),
        'data-test-subj': 'extraCreateOptionCard',
      },
    ]);

    expect(screen.getByTestId('createActionPolicyCard')).toBeInTheDocument();
    expect(screen.getByTestId('createActionPolicyWithAgentCard')).toBeInTheDocument();
    expect(screen.getByTestId('extraCreateOptionCard')).toBeInTheDocument();
  });

  it('calls an option onClick when its card is clicked', () => {
    renderPanel([createPolicyOption(), createWithAgentOption()]);

    fireEvent.click(screen.getByTestId('createActionPolicyCard'));
    fireEvent.click(screen.getByTestId('createActionPolicyWithAgentCard'));

    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);
  });

  it('renders a disabled option and does not fire onClick', () => {
    renderPanel([
      createPolicyOption(),
      createWithAgentOption({ disabled: true, tooltipText: 'Missing privileges' }),
    ]);

    const agentCard = screen.getByTestId('createActionPolicyWithAgentCard');
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('shows tooltip text on hover regardless of the disabled state', async () => {
    renderPanel([
      createPolicyOption(),
      createWithAgentOption({ disabled: true, tooltipText: 'Missing privileges' }),
    ]);

    fireEvent.mouseOver(screen.getByTestId('createActionPolicyWithAgentCard'));

    expect(await screen.findByText('Missing privileges')).toBeInTheDocument();
  });

  it('disables an option without a tooltip when only disabled is set', () => {
    renderPanel([createPolicyOption(), createWithAgentOption({ disabled: true })]);

    const agentCard = screen.getByTestId('createActionPolicyWithAgentCard');
    expect(agentCard).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).not.toHaveBeenCalled();
  });

  it('shows a tooltip without disabling when only tooltipText is set', async () => {
    renderPanel([createPolicyOption(), createWithAgentOption({ tooltipText: 'Extra context' })]);

    const agentCard = screen.getByTestId('createActionPolicyWithAgentCard');
    expect(agentCard).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(agentCard);
    expect(onCreateWithAgent).toHaveBeenCalledTimes(1);

    fireEvent.mouseOver(agentCard);
    expect(await screen.findByText('Extra context')).toBeInTheDocument();
  });
});

describe('getCreateActionPolicyWithAgentTooltipText', () => {
  it('returns undefined when both prerequisites are met', () => {
    expect(
      getCreateActionPolicyWithAgentTooltipText({
        hasAgentBuilderCapability: true,
        isExperimentalFeaturesEnabled: true,
      })
    ).toBeUndefined();
  });

  it('names only the privilege when only the capability is missing', () => {
    const tooltip = getCreateActionPolicyWithAgentTooltipText({
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: true,
    });

    expect(tooltip).toContain('Agent Builder: Read');
    expect(tooltip).not.toContain('advanced setting');
  });

  it('names only the advanced setting when only the experimental feature is missing', () => {
    const tooltip = getCreateActionPolicyWithAgentTooltipText({
      hasAgentBuilderCapability: true,
      isExperimentalFeaturesEnabled: false,
    });

    expect(tooltip).toContain('Elastic Agent Builder: Experimental Features');
    expect(tooltip).toContain('advanced setting');
    expect(tooltip).not.toContain('Agent Builder: Read');
  });

  it('names both prerequisites when neither is met', () => {
    const tooltip = getCreateActionPolicyWithAgentTooltipText({
      hasAgentBuilderCapability: false,
      isExperimentalFeaturesEnabled: false,
    });

    expect(tooltip).toContain('Agent Builder: Read');
    expect(tooltip).toContain('Elastic Agent Builder: Experimental Features');
  });
});
