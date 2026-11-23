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
import { DeleteRuleModal } from './delete_rule_modal';

const fallback = (name: string, overrides: Partial<FallbackTarget> = {}): FallbackTarget => ({
  name,
  nextRuleName: 'default_indices',
  nextProfileName: '_performant_indices',
  ...overrides,
});

const meta: Meta<typeof DeleteRuleModal> = {
  title: 'Search boost/Modals/Delete boost rule',
  component: DeleteRuleModal,
  render: ({ onCancel, onConfirm, ...args }) => (
    <ModalStory
      buttonLabel="Delete boost rule"
      renderModal={(close) => (
        <DeleteRuleModal
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
    ruleName: 'product-catalog',
    type: 'indices',
    fallbacks: [
      fallback('products'),
      fallback('catalog-2026-fall', { nextRuleName: 'catalog', nextProfileName: 'catalog-fast' }),
      fallback('.products-backup'),
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

type Story = StoryObj<typeof DeleteRuleModal>;

export const Indices: Story = {};

export const DataStreams: Story = {
  args: {
    ruleName: 'logs-oracle',
    type: 'data_streams',
    fallbacks: [
      fallback('logs-oracle-default', {
        nextRuleName: 'default_data_streams',
        nextProfileName: '_performant_data_streams',
      }),
      fallback('.alert-actions', {
        nextRuleName: 'default_data_streams',
        nextProfileName: '_performant_data_streams',
      }),
      fallback('.edr-workflow-insights-default', {
        nextRuleName: 'default_data_streams',
        nextProfileName: '_performant_data_streams',
      }),
      fallback('.logs-elasticsearch.deprecation-default', {
        nextRuleName: 'default_data_streams',
        nextProfileName: '_performant_data_streams',
      }),
      fallback('logs-kubernetes.container_logs-production-eu-west-1-cluster-a', {
        nextRuleName: 'logs-kubernetes-production-all-regions',
        nextProfileName: 'logs-kubernetes-recent-two-weeks-high-boost',
      }),
    ],
  },
};

export const AppliesToNothing: Story = {
  args: { fallbacks: [] },
};

export const Loading: Story = {
  args: { fallbacks: [], isLoading: true },
};

export const LoadError: Story = {
  args: { fallbacks: [], loadError: new Error('Request timed out') },
};

export const Deleting: Story = {
  args: { isDeleting: true },
};
