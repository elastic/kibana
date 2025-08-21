/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Meta, StoryObj } from '@storybook/react';

import { FailureStoreModal } from './failure_store_modal';

const meta: Meta<typeof FailureStoreModal> = {
  component: FailureStoreModal,
  title: 'Failure Store Modal',
};

export default meta;
type Story = StoryObj<typeof FailureStoreModal>;

export const Primary: Story = {
  args: {
    onCloseModal: () => {},
    onSaveModal: () => {},
    failureStoreProps: {
      failureStoreEnabled: false,
      defaultRetentionPeriod: '40d',
    },
  },
};
