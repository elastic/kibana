/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import type { StoryFn } from '@storybook/react';
import { ALERT_STATUS_RECOVERED, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import {
  AlertLifecycleStatusBadge,
  AlertLifecycleStatusBadgeProps,
} from './alert_lifecycle_status_badge';

type Args = ComponentProps<typeof AlertLifecycleStatusBadge>;

export default {
  title: 'app/AlertLifecyceStatusBadge',
  component: AlertLifecycleStatusBadge,
  argTypes: {
    alertStatus: {
      defaultValue: ALERT_STATUS_ACTIVE,
      control: {
        type: 'select',
        options: [ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED],
      },
    },
    flapping: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
  },
};

const Template: StoryFn<Args> = (args: AlertLifecycleStatusBadgeProps) => {
  return <AlertLifecycleStatusBadge {...args} />;
};

export const Active = {
  render: Template,

  args: {
    alertStatus: ALERT_STATUS_ACTIVE,
    flapping: false,
  },
};

export const Flapping = {
  render: Template,

  args: {
    alertStatus: ALERT_STATUS_ACTIVE,
    flapping: true,
  },
};

export const Recovered = {
  render: Template,

  args: {
    alertStatus: ALERT_STATUS_RECOVERED,
    flapping: false,
  },
};
