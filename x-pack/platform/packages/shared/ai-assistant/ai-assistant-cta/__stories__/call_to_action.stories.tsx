/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AssistantCallToAction as Component } from '../call_to_action';

export default {
  title: 'Layout/Call to Action',
  component: Component,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    centered: true,
  },
  argTypes: {
    description: {
      control: 'text',
    },
    title: {
      control: 'text',
    },
    centered: {
      control: 'boolean',
    },
  },
} as Meta<typeof Component>;

export const CallToAction: StoryFn<typeof Component> = (args) => {
  const component = (
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

  return (
    <EuiFlexGroup
      justifyContent="center"
      direction="row"
      alignItems="center"
      style={{ height: '100vh' }}
    >
      <EuiFlexItem grow={true}>
        <div>{component}</div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
