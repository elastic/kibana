/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlyout, EuiFlyoutBody, EuiText } from '@elastic/eui';
import { FlyoutFooterWithRetentionWarning } from '../flyout_footer_with_retention_warning';

const meta: Meta<typeof FlyoutFooterWithRetentionWarning> = {
  title: 'Data Lifecycle Phases / FlyoutFooterWithRetentionWarning',
  component: FlyoutFooterWithRetentionWarning,
  decorators: [
    (Story) => (
      <EuiFlyout
        aria-label="Data lifecycle flyout footer preview"
        onClose={() => {}}
        size={400}
        ownFocus
        paddingSize="none"
      >
        <EuiFlyoutBody>
          <EuiText>Flyout body content — the footer is always anchored at the bottom.</EuiText>
        </EuiFlyoutBody>
        <Story />
      </EuiFlyout>
    ),
  ],
  args: {
    onCancel: action('onCancel'),
    onApply: action('onApply'),
  },
};

export default meta;

type Story = StoryObj<typeof FlyoutFooterWithRetentionWarning>;

export const Default: Story = {
  name: 'Default (no warning)',
};

export const WithWarning: Story = {
  name: 'With warning callout',
  args: {
    showWarning: true,
  },
};

export const CustomLabels: Story = {
  name: 'Custom button labels',
  args: {
    cancelLabel: 'Discard',
    applyLabel: 'Import',
  },
};

export const CustomLabelsWithWarning: Story = {
  name: 'Custom labels + warning',
  args: {
    cancelLabel: 'Discard',
    applyLabel: 'Import',
    showWarning: true,
  },
};

export const ApplyDisabled: Story = {
  name: 'Apply button disabled',
  args: {
    isApplyDisabled: true,
  },
};

export const ApplyDisabledWithWarning: Story = {
  name: 'Apply disabled + warning',
  args: {
    isApplyDisabled: true,
    showWarning: true,
  },
};
