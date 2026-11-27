/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { FallbackTarget } from '../../../common/types';
import { ModalStory } from '../test_utils/modal_story';
import { DeleteProfileModal } from './delete_profile_modal';

const fallback = (name: string, overrides: Partial<FallbackTarget> = {}): FallbackTarget => ({
  name,
  nextRuleName: 'default_indices',
  nextProfileName: '_performant_indices',
  ...overrides,
});

const meta: Meta<typeof DeleteProfileModal> = {
  title: 'Search boost/Modals/Delete boost profile',
  component: DeleteProfileModal,
  render: ({ onCancel, onConfirm, ...args }) => (
    <ModalStory
      buttonLabel="Delete boost profile"
      renderModal={(close) => (
        <DeleteProfileModal
          {...args}
          onCancel={() => {
            onCancel();
            close();
          }}
          onConfirm={() => {
            onConfirm();
            close();
          }}
        />
      )}
    />
  ),
  args: {
    profileName: 'catalog-fast',
    type: 'indices',
    rules: [
      {
        name: 'product-catalog',
        fallbacks: [
          fallback('products'),
          fallback('catalog-2026-fall', { nextRuleName: 'catalog', nextProfileName: 'archive' }),
          fallback('.products-backup'),
          fallback('.internal-catalog-sync-history-2026-11-23-000001'),
          fallback('catalog-products-eu-west-1-production-archive-2026-november', {
            nextRuleName: 'catalog-products-all-regions-fallback',
            nextProfileName: 'catalog-products-recent-high-boost',
          }),
        ],
      },
      { name: 'catalog-staging', fallbacks: [] },
      { name: 'catalog-search', fallbacks: [fallback('catalog-search-2026')] },
      {
        name: 'catalog_products_eu_west_production_archive_rule_for_november_and_december_with_backups_kept',
        fallbacks: [fallback('catalog-archive-2026')],
      },
    ],
    isDeleting: false,
    isLoading: false,
    onCancel: action('onCancel'),
    onConfirm: action('onConfirm'),
    onRetryLoad: action('onRetryLoad'),
  },
  argTypes: {
    type: { control: 'radio', options: ['indices', 'data_streams'] },
  },
};

export default meta;

type Story = StoryObj<typeof DeleteProfileModal>;

export const Indices: Story = {};

export const DataStreams: Story = {
  args: {
    profileName: 'logs-recent-week',
    type: 'data_streams',
    rules: [
      {
        name: 'logs-nginx',
        fallbacks: [
          'access',
          'error',
          'ingress',
          'upstream',
          'cache',
          'proxy',
          'stream',
          'status',
          'auth',
          'rate-limit',
          'geoip',
          'ssl',
          'websocket',
          'health',
          'metrics',
        ].map((dataset) =>
          fallback(`logs-nginx.${dataset}-default`, {
            nextRuleName: 'default_data_streams',
            nextProfileName: '_performant_data_streams',
          })
        ),
      },
      {
        name: 'logs-oracle',
        fallbacks: [
          fallback('logs-oracle-default', {
            nextRuleName: 'default_data_streams',
            nextProfileName: '_performant_data_streams',
          }),
        ],
      },
    ],
  },
};

export const RulesApplyToNothing: Story = {
  args: {
    rules: [
      { name: 'catalog-staging', fallbacks: [] },
      { name: 'catalog-preview', fallbacks: [] },
    ],
  },
};

export const NotUsed: Story = {
  args: { rules: [] },
};

export const Loading: Story = {
  args: { rules: [], isLoading: true },
};

export const LoadError: Story = {
  args: { rules: [], loadError: new Error('Request timed out') },
};

export const Deleting: Story = {
  args: { isDeleting: true },
};
