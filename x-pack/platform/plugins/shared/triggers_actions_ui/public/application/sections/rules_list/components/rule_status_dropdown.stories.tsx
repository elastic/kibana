/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RuleStatusDropdown } from './rule_status_dropdown';
import { mockRule } from '../../rule_details/components/test_helpers';

type Args = ComponentProps<typeof RuleStatusDropdown>;

const rule = mockRule({ ruleTypeId: 'test-rule-type-id' });

export default {
  title: 'app/RuleStatusDropdown',
  component: RuleStatusDropdown,
  argTypes: {
    rule: {
      defaultValue: rule,
      control: {
        type: 'object',
      },
    },
    onRuleChanged: {},
    enableRule: {},
    disableRule: {},
    snoozeRule: {},
    unsnoozeRule: {},
    isEditable: {
      defaultValue: true,
      control: {
        type: 'boolean',
      },
    },
    direction: {
      defaultValue: 'column',
      control: {
        type: 'text',
      },
    },
    hideSnoozeOption: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    rule,
    onRuleChanged: (...args: any) => action('onRuleChanged')(args),
    enableRule: (...args: any) => action('enableRule')(args),
    disableRule: (...args: any) => action('disableRule')(args),
    snoozeRule: (...args: any) => action('snoozeRule')(args),
    unsnoozeRule: (...args: any) => action('unsnoozeRule')(args),
  },
};

const Template: Story<Args> = (args) => {
  return <RuleStatusDropdown {...args} />;
};

export const EnabledRule = Template.bind({});

export const DisabledRule = Template.bind({});

DisabledRule.args = {
  rule: mockRule({ enabled: false }),
};
