/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { AssistantAvatar as Component } from '../avatar';

export default {
  title: 'Assistant Icon/Avatar',
  component: Component,
  argTypes: {
    iconSize: {
      control: 'select',
      options: ['original', 's', 'm', 'l', 'xl', 'xxl', undefined],
      defaultValue: undefined,
    },
    size: {
      control: 'select',
      options: ['s', 'm', 'l', 'xl', undefined],
      defaultValue: undefined,
    },
    name: {
      control: 'text',
      defaultValue: 'Elastic Assistant',
    },
  },
} as ComponentMeta<typeof Component>;

export const Avatar: ComponentStory<typeof Component> = (args) => <Component {...args} />;
