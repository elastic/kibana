/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { FailureStoreModal } from './failure_store_modal';

const meta: Meta<typeof FailureStoreModal> = {
  component: FailureStoreModal,
  title: 'Failure Store Modal',
  args: {
    onCloseModal: fn(),
    onSaveModal: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FailureStoreModal>;

export const BasicModal: Story = {
  args: {
    failureStoreProps: {
      failureStoreEnabled: false,
      defaultRetentionPeriod: '40d',
    },
    showIlmDescription: false,
  },
};

export const BasicModalWithoutRetention: Story = {
  args: {
    failureStoreProps: {
      failureStoreEnabled: true,
    },
  },
};

export const InheritanceModal: Story = {
  args: {
    failureStoreProps: {
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
      customRetentionPeriod: '40d',
    },
    inheritOptions: {
      canShowInherit: true,
      isWired: true,
      isCurrentlyInherited: false,
    },
    showIlmDescription: false,
  },
};
