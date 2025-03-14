/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AssistantCallToAction as Component } from '../call_to_action';

export default {
  title: 'Layout/Call to Action',
  component: Component,
  argTypes: {
    description: {
      control: 'text',
    },
    title: {
      control: 'text',
    },
  },
} as ComponentMeta<typeof Component>;

export const CallToAction: ComponentStory<typeof Component> = (args) => (
  <Component {...args}>
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem>
        <EuiButton color="primary" fill>
          Some action to take.
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton color="primary">Another action to take.</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Component>
);
