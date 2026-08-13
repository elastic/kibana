/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  DefaultRepositoryRequiredBadge,
  EnterpriseLicenseRequiredBadge,
} from '../phase_requirement_badges';

const meta: Meta = {
  title: 'Data Lifecycle Phases / Phase requirement badges',
};

export default meta;
type Story = StoryObj;

export const EnterpriseLicenseRequired: Story = {
  render: () => (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 120 }}>
      <EuiFlexItem grow={false}>
        <EnterpriseLicenseRequiredBadge onClick={() => action('onClick')()} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};

export const DefaultRepositoryRequired: Story = {
  render: () => (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 120 }}>
      <EuiFlexItem grow={false}>
        <DefaultRepositoryRequiredBadge onClick={() => action('onClick')()} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};
