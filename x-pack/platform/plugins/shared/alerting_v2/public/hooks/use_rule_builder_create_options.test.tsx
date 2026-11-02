/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RULE_BUILDER_REGISTRY } from '@kbn/alerting-v2-rule-form';
import { RuleCreateOptionsPanel } from '../components/rule_create_options/rule_create_options_panel';
import { queueRuleBuilderRegistration } from '../rule_builder_registration';

jest.mock('./use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => true,
  useAgentBuilderSkillsRequirements: () => ({ hasAgentBuilderCapability: true }),
}));

const earlierBuilder = {
  type: 'earlier-builder',
  stepTitle: 'Earlier',
  createOption: {
    title: 'Earlier rule',
    description: 'Earlier builder',
    iconType: 'bell',
    order: 5,
    flyoutTitle: 'Create Earlier rule',
    dataTestSubj: 'createEarlierRuleCard',
  },
  createDefaultState: () => ({}),
  renderStep: () => null,
};

const laterBuilder = {
  type: 'later-builder',
  stepTitle: 'Later',
  createOption: {
    title: 'Later rule',
    description: 'Later builder',
    iconType: 'bell',
    order: 20,
    flyoutTitle: 'Create Later rule',
    dataTestSubj: 'createLaterRuleCard',
  },
  createDefaultState: () => ({}),
  renderStep: () => null,
};

describe('useRuleBuilderCreateOptions', () => {
  beforeAll(() => {
    queueRuleBuilderRegistration(earlierBuilder);
    queueRuleBuilderRegistration(laterBuilder);
  });

  afterAll(() => {
    delete RULE_BUILDER_REGISTRY['earlier-builder'];
    delete RULE_BUILDER_REGISTRY['later-builder'];
  });

  it('shows builders queued before the form package loads, in order, and opens the selected type', async () => {
    const onCreateBuilderRule = jest.fn();

    render(
      <I18nProvider>
        <RuleCreateOptionsPanel
          onCreateEsqlRule={jest.fn()}
          onCreateWithAgent={jest.fn()}
          onCreateBuilderRule={onCreateBuilderRule}
        />
      </I18nProvider>
    );

    await screen.findByTestId('createEarlierRuleCard');

    expect(
      screen
        .getAllByTestId(/create(?:Earlier|Threshold|Later)RuleCard/)
        .map((card) => card.getAttribute('data-test-subj'))
    ).toEqual(['createEarlierRuleCard', 'createThresholdRuleCard', 'createLaterRuleCard']);

    fireEvent.click(screen.getByTestId('createLaterRuleCard'));

    expect(onCreateBuilderRule).toHaveBeenCalledWith('later-builder');
  });
});
