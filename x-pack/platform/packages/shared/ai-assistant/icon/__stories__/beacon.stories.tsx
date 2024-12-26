/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import { AssistantBeacon as Component } from '../beacon';

export default {
  title: 'Assistant Icon/Beacon',
  component: Component,
  argTypes: {
    size: {
      control: 'select',
      options: ['original', 's', 'm', 'l', 'xl', 'xxl'],
      defaultValue: 'xxl',
    },
  },
} as Meta<typeof Component>;

export const Beacon: StoryFn<typeof Component> = (args) => <Component {...args} />;
