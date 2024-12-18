/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { EuiText } from '@elastic/eui';
import { RulesListNotifyBadgeWithApi } from './notify_badge_with_api';
import { RulesListNotifyBadgePropsWithApi } from './types';

const rule = {
  id: uuidv4(),
  name: '',
  activeSnoozes: [],
  isSnoozedUntil: undefined,
  muteAll: false,
  isEditable: true,
  snoozeSchedule: [],
};

export default {
  title: 'app/RulesListNotifyBadgeWithApi',
  component: RulesListNotifyBadgeWithApi,
  argTypes: {
    snoozeSettings: {
      defaultValue: rule,
      control: {
        type: 'object',
      },
    },
    isLoading: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    showOnHover: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    showTooltipInline: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    onRuleChanged: {},
  },
  args: {
    snoozeSettings: rule,
    onRuleChanged: (...args: any) => action('onRuleChanged')(args),
  },
} as Meta<RulesListNotifyBadgePropsWithApi>;

const Template: Story<RulesListNotifyBadgePropsWithApi> = (args) => {
  return <RulesListNotifyBadgeWithApi {...args} />;
};

export const DefaultRuleNotifyBadgeWithApi = Template.bind({});

const IndefinitelyDate = new Date();
IndefinitelyDate.setDate(IndefinitelyDate.getDate() + 1);
export const IndefinitelyRuleNotifyBadgeWithApi = Template.bind({});
IndefinitelyRuleNotifyBadgeWithApi.args = {
  snoozeSettings: {
    ...rule,
    muteAll: true,
    isSnoozedUntil: IndefinitelyDate,
  },
};

export const ActiveSnoozesRuleNotifyBadgeWithApi = Template.bind({});
const ActiveSnoozeDate = new Date();
ActiveSnoozeDate.setDate(ActiveSnoozeDate.getDate() + 2);
ActiveSnoozesRuleNotifyBadgeWithApi.args = {
  snoozeSettings: {
    ...rule,
    activeSnoozes: ['24da3b26-bfa5-4317-b72f-4063dbea618e'],
    isSnoozedUntil: ActiveSnoozeDate,
    snoozeSchedule: [
      {
        duration: 172800000,
        rRule: {
          tzid: 'America/New_York',
          count: 1,
          dtstart: ActiveSnoozeDate.toISOString(),
        },
        id: '24da3b26-bfa5-4317-b72f-4063dbea618e',
      },
    ],
  },
};

const SnoozeDate = new Date();
export const ScheduleSnoozesRuleNotifyBadgeWithApi: Story<RulesListNotifyBadgePropsWithApi> = (
  args
) => {
  return (
    <div>
      <EuiText size="s">Open popover to see the next snoozes scheduled</EuiText>
      <RulesListNotifyBadgeWithApi {...args} />
    </div>
  );
};

ScheduleSnoozesRuleNotifyBadgeWithApi.args = {
  snoozeSettings: {
    ...rule,
    snoozeSchedule: [
      {
        duration: 172800000,
        rRule: {
          tzid: 'America/New_York',
          count: 1,
          dtstart: new Date(SnoozeDate.setDate(SnoozeDate.getDate() + 2)).toISOString(),
        },
        id: '24da3b26-bfa5-4317-b72f-4063dbea618e',
      },
      {
        duration: 172800000,
        rRule: {
          tzid: 'America/New_York',
          count: 1,
          dtstart: new Date(SnoozeDate.setDate(SnoozeDate.getDate() + 2)).toISOString(),
        },
        id: '24da3b26-bfa5-4317-b72f-4063dbea618e',
      },
    ],
  },
};
