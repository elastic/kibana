/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import { AddConnector as Component } from '../add_connector';

export default {
  title: 'Layout/Call to Action/Types',
  component: Component,
  argTypes: {
    onAddConnector: { action: 'onAddConnector' },
  },
} as Meta<typeof Component>;

export const AddConnector: StoryFn<typeof Component> = (args) => <Component {...args} />;
