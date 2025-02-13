/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Meta } from '@storybook/react';
import { RuleEventLogList, RuleEventLogListProps } from './rule_event_log_list';
import { mockRule, mockRuleType } from './test_helpers';

type Args = ComponentProps<typeof RuleEventLogList>;

const rule = mockRule({ ruleTypeId: 'test-rule-type-id' });
const ruleType = mockRuleType();

export default {
  title: 'app/RuleEventLogList',
  component: RuleEventLogList,
  argTypes: {
    rule: {
      control: {
        type: 'object',
      },
    },
    ruleType: {
      control: {
        type: 'object',
      },
    },
    localStorageKey: {
      defaultValue: 'xpack.triggersActionsUI.ruleEventLogList.initialColumns',
      control: {
        type: 'text',
      },
    },
    refreshToken: {
      control: {
        type: 'number',
      },
    },
    requestRefresh: {},
    fetchRuleSummary: {
      defaultValue: true,
      control: {
        type: 'boolean',
      },
    },
    ruleSummary: {
      control: {
        type: 'object',
      },
    },
    onChangeDuration: {},
    numberOfExecutions: {
      control: {
        type: 'number',
      },
    },
    isLoadingRuleSummary: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    rule,
    ruleType,
  },
} as Meta<Args>;

const Template = (args: RuleEventLogListProps) => {
  return <RuleEventLogList {...args} />;
};

export const Empty = Template.bind({});

export const WithEvents = Template.bind({});

export const WithPaginatedEvents = Template.bind({});
