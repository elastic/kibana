/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FlyoutWithTabs, type NonEmptyFlyoutTabs } from '../flyout_with_tabs';

type DemoTab = 'one' | 'two' | 'three';

const TABS: NonEmptyFlyoutTabs<DemoTab> = [
  { id: 'one', label: 'Tab one' },
  { id: 'two', label: 'Tab two' },
  { id: 'three', label: 'Tab three' },
];

const meta: Meta<typeof FlyoutWithTabs> = {
  title: 'Flyout with tabs',
  component: FlyoutWithTabs,
};

export default meta;
type Story = StoryObj<typeof FlyoutWithTabs>;

export const Default: Story = {
  render: () => (
    <FlyoutWithTabs
      title="My flyout"
      tabsAriaLabel="Demo tabs"
      tabs={TABS}
      onClose={action('onClose')}
    >
      {(selectedTab) => <p style={{ padding: 24 }}>Selected: {selectedTab}</p>}
    </FlyoutWithTabs>
  ),
};
