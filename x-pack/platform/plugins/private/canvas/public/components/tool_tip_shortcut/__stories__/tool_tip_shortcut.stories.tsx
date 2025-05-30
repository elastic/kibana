/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { ToolTipShortcut } from '../tool_tip_shortcut';

export default {
  title: 'components/ToolTipShortcut',

  decorators: [
    (story) => (
      <div style={{ width: '100px', backgroundColor: '#343741', padding: '5px' }}>{story()}</div>
    ),
  ],
} as Meta;

export const WithShortcut = {
  render: () => <ToolTipShortcut shortcut="G" />,
  name: 'with shortcut',
};

export const WithCmd = {
  render: () => <ToolTipShortcut shortcut="⌘ + D" />,
  name: 'with cmd',
};

export const WithAlt = {
  render: () => <ToolTipShortcut shortcut="⌥ + P" />,
  name: 'with alt',
};

export const WithLeftArrow = {
  render: () => <ToolTipShortcut shortcut="←" />,
  name: 'with left arrow',
};

export const WithRightArrow = {
  render: () => <ToolTipShortcut shortcut="→" />,
  name: 'with right arrow',
};

export const WithUpArrow = {
  render: () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↑" />,
  name: 'with up arrow',
};

export const WithDownArrow = {
  render: () => <ToolTipShortcut shortcut="⌘ + SHIFT + ↓" />,
  name: 'with down arrow',
};
