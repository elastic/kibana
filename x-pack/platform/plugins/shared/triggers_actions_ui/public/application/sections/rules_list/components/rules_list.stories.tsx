/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, useEffect } from 'react';
import { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { RulesList, RulesListProps } from './rules_list';

type Args = ComponentProps<typeof RulesList>;

export default {
  title: 'app/RulesList',
  component: RulesList,
  decorators: [
    (StoryComponent) => {
      return (
        <MemoryRouter>
          <StoryComponent />
        </MemoryRouter>
      );
    },
  ],
  argTypes: {
    filteredRuleTypes: {
      defaultValue: [],
      control: {
        type: 'object',
      },
    },
    showActionFilter: {
      defaultValue: true,
      control: {
        type: 'boolean',
      },
    },
    ruleDetailsRoute: {
      control: {
        type: 'text',
      },
    },
    statusFilter: {
      defaultValue: [],
      control: {
        type: 'object',
      },
    },
    lastResponseFilter: {
      defaultValue: [],
      control: {
        type: 'object',
      },
    },
    onStatusFilterChange: {
      action: 'onStatusFilterChange',
    },
    onLastResponseFilterChange: {
      action: 'onLastResponseFilterChange',
    },
    refresh: {
      control: {
        type: 'date',
      },
    },
    rulesListKey: {
      control: {
        type: 'text',
      },
    },
    visibleColumns: {
      defaultValue: [
        'ruleName',
        'ruleTags',
        'ruleExecutionStatusLastDate',
        'ruleSnoozeNotify',
        'ruleScheduleInterval',
        'ruleExecutionStatusLastDuration',
        'ruleExecutionPercentile',
        'ruleExecutionSuccessRatio',
        'ruleExecutionStatus',
        'ruleExecutionState',
      ],
      control: {
        type: 'object',
      },
    },
  },
} as Meta<Args>;

const Template = (args: RulesListProps) => {
  const location = useLocation();
  useEffect(() => {
    action('location')(location);
  }, [location]);
  return <RulesList {...args} />;
};

export const Empty = Template.bind({});

export const WithRules = Template.bind({});

export const WithPaginatedRules = Template.bind({});
