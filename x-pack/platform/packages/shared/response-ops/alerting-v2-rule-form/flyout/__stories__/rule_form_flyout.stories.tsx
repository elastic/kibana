/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RuleFormFlyout } from '../rule_form_flyout';

const mockServices = {
  http: {
    post: async (path: string, options: any) => {
      action('http.post')(path, options);
      return { id: 'mock-rule-id', name: 'Mock Rule' };
    },
  } as any,
  data: {
    search: {
      search: () => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
    },
  } as any,
  dataViews: {
    getIdsWithTitle: async () => [],
    get: async () => ({
      fields: {
        getByType: () => [{ name: '@timestamp', type: 'date' }],
      },
      getIndexPattern: () => 'logs-*',
      timeFieldName: '@timestamp',
    }),
    create: async () => ({
      fields: {
        getByType: () => [{ name: '@timestamp', type: 'date' }],
      },
      getIndexPattern: () => 'logs-*',
      timeFieldName: '@timestamp',
    }),
  } as any,
  notifications: {
    toasts: {
      addSuccess: action('toast.success'),
      addDanger: action('toast.danger'),
    },
  } as any,
};

const meta: Meta<typeof RuleFormFlyout> = {
  title: 'Alerting V2/RuleFormFlyout',
  component: RuleFormFlyout,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    push: {
      control: 'boolean',
      description: 'Whether to use a push flyout or overlay',
    },
    query: {
      control: 'text',
      description: 'The query',
    },
    defaultTimeField: {
      control: 'text',
      description: 'Default time field for the rule',
    },
    isQueryInvalid: {
      control: 'boolean',
      description: 'Whether the query has validation errors',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RuleFormFlyout>;

export const Default: Story = {
  args: {
    services: mockServices,
    query: 'FROM logs-* | WHERE @timestamp > NOW() - 5m | STATS count = COUNT(*)',
    defaultTimeField: '@timestamp',
    push: true,
    isQueryInvalid: false,
    onClose: action('onClose'),
  },
};
