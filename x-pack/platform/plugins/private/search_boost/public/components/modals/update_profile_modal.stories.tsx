/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { ProfileTarget } from '../../../common/types';
import { ModalStory } from '../test_utils/modal_story';
import { UpdateProfileModal } from './update_profile_modal';

const target = (name: string, overrides: Partial<ProfileTarget> = {}): ProfileTarget => ({
  name,
  ruleName: 'product-catalog',
  ...overrides,
});

const meta: Meta<typeof UpdateProfileModal> = {
  title: 'Search boost/Modals/Update boost profile',
  component: UpdateProfileModal,
  render: ({ onCancel, onSave, saveAsNew, ...args }) => (
    <ModalStory
      buttonLabel="Save profile changes"
      renderModal={(close) => (
        <UpdateProfileModal
          {...args}
          onCancel={() => {
            onCancel();
            close();
          }}
          onSave={() => {
            onSave();
            close();
          }}
          saveAsNew={
            saveAsNew && {
              ...saveAsNew,
              onSave: (name) => {
                saveAsNew.onSave(name);
                if (saveAsNew.nameError?.name !== name) {
                  close();
                }
              },
            }
          }
        />
      )}
    />
  ),
  args: {
    profileName: 'catalog-fast',
    type: 'indices',
    targets: [
      target('products'),
      target('catalog-2026-fall', { ruleName: 'catalog-search' }),
      target('.products-backup'),
      target('.internal-catalog-sync-history-2026-11-23-000001', {
        ruleName: 'catalog-search',
      }),
      target('catalog-products-eu-west-1-production-archive-2026-november', {
        ruleName: 'catalog-search',
      }),
    ],
    isSaving: false,
    isLoading: false,
    onCancel: action('onCancel'),
    onSave: action('onSave'),
    saveAsNew: { suggestedName: 'catalog-fast-copy', onSave: action('onSaveAsNew') },
    onRetryLoad: action('onRetryLoad'),
  },
  argTypes: {
    type: { control: 'radio', options: ['indices', 'data_streams'] },
  },
};

export default meta;

type Story = StoryObj<typeof UpdateProfileModal>;

export const Indices: Story = {};

export const DataStreams: Story = {
  args: {
    profileName: 'logs-recent-week',
    type: 'data_streams',
    targets: [target('logs-oracle-default', { ruleName: 'logs-oracle' })],
  },
};

export const WithoutSaveAsNew: Story = {
  args: { saveAsNew: undefined },
};

export const SaveAsNewNameTaken: Story = {
  args: {
    saveAsNew: {
      suggestedName: 'catalog-fast-copy',
      nameError: {
        name: 'catalog-fast-copy',
        message: 'A boost profile with this name already exists.',
      },
      onSave: action('onSaveAsNew'),
    },
  },
};

export const Loading: Story = {
  args: { targets: [], isLoading: true },
};

export const LoadError: Story = {
  args: { targets: [], loadError: new Error('Request timed out') },
};

export const Saving: Story = {
  args: { isSaving: true },
};
