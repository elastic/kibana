/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';
import { SidebarHeader } from '../sidebar_header.component';

const handlers = {
  bringToFront: action('bringToFront'),
  bringForward: action('bringForward'),
  sendBackward: action('sendBackward'),
  sendToBack: action('sendToBack'),
};

export default {
  title: 'components/Sidebar/SidebarHeader',
  decorators: [(story) => <div style={{ width: '300px' }}>{story()}</div>],
} as Meta;

export const Default = {
  render: () => <SidebarHeader title="Selected layer" {...handlers} />,
  name: 'default',
};

export const WithLayerControls = {
  render: () => <SidebarHeader title="Grouped element" showLayerControls={true} {...handlers} />,

  name: 'with layer controls',
};
