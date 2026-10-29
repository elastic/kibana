/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { ConfirmDeleteDataSetModal } from './confirm_delete_data_set_modal';

const meta: Meta<typeof ConfirmDeleteDataSetModal> = {
  component: ConfirmDeleteDataSetModal,
  title: 'Data Federation/Confirm delete dataset modal',
  args: {
    dataSetName: 'access_logs',
    isDeleting: false,
    error: null,
    onCancel: action('onCancel'),
    onConfirm: action('onConfirm'),
  },
};

export default meta;

type Story = StoryObj<typeof ConfirmDeleteDataSetModal>;

export const Default: Story = {};

export const Deleting: Story = {
  args: {
    isDeleting: true,
  },
};

export const WithError: Story = {
  args: {
    error: 'The dataset could not be deleted. Try again later.',
  },
};
