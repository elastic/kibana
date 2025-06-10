/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import { ReadyToHelp as Component } from '../ready_to_help';

export default {
  title: 'Layout/Call to Action/Types',
  component: Component,
  args: {
    type: 'stack',
  },
  argTypes: {
    type: {
      control: 'radio',
      options: ['stack', 'security', 'oblt', 'search'],
      defaultValue: 'stack',
    },
  },
} as Meta<typeof Component>;

export const ReadyToHelp: StoryFn<typeof Component> = (args) => <Component {...args} />;
