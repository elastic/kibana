/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DynamicRuleFormFlyout } from '../dynamic_rule_form_flyout';
import { RuleFormFlyout } from '../rule_form_flyout';
import { DynamicRuleForm } from '../../form/dynamic_rule_form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { NOOP_WORKFLOW_FORM } from '../../form/contexts/rule_form_context';

const mockServices = {
  http: {
    post: async (path: string, options: any) => {
      action('http.post')(path, options);
      return { id: 'mock-rule-id', metadata: { name: 'Mock Rule' } };
    },
  } as any,
  notifications: {
    toasts: {
      addSuccess: action('toast.success'),
      addDanger: action('toast.danger'),
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
  application: {
    currentAppId$: {
      subscribe: () => ({ unsubscribe: () => {} }),
    },
  } as any,
  lens: {
    EmbeddableComponent: () => null,
    stateHelperApi: () => ({}),
  } as any,
  workflowForm: NOOP_WORKFLOW_FORM,
  uiActions: {
    getAction: async () => ({
      execute: ({ onResults }: { onResults: (results: unknown[]) => void }) => onResults([]),
    }),
  } as any,
};

const mockFormServices: RuleFormServices = {
  http: mockServices.http,
  data: mockServices.data,
  dataViews: mockServices.dataViews,
  application: mockServices.application,
  notifications: mockServices.notifications,
  lens: mockServices.lens,
  workflowForm: NOOP_WORKFLOW_FORM,
  uiActions: mockServices.uiActions,
};

// =============================================================================
// Pre-composed Flyouts (Recommended)
// =============================================================================

const dynamicMeta: Meta<typeof DynamicRuleFormFlyout> = {
  title: 'Alerting V2/Pre-composed Flyouts',
  component: DynamicRuleFormFlyout,
  parameters: {
    layout: 'fullscreen',
  },
};

export default dynamicMeta;

type DynamicStory = StoryObj<typeof DynamicRuleFormFlyout>;

/**
 * DynamicRuleFormFlyout - For Discover integration
 * Syncs with external query changes while preserving user input.
 * Time field is auto-selected from available date fields.
 */
export const Dynamic: DynamicStory = {
  args: {
    services: mockServices,
    query: 'FROM logs-* | WHERE @timestamp > NOW() - 5m | STATS count = COUNT(*) BY host.name',
    push: true,
    onClose: action('onClose'),
  },
};

/**
 * DynamicRuleFormFlyout with the Form/YAML edit mode toggle enabled.
 * This is the configuration used when opened from the Discover flyout.
 */
export const DynamicWithYamlToggle: DynamicStory = {
  args: {
    services: mockServices,
    query: 'FROM logs-* | WHERE @timestamp > NOW() - 5m | STATS count = COUNT(*) BY host.name',
    push: true,
    onClose: action('onClose'),
    includeYaml: true,
  },
};

/**
 * Dynamic flyout with syntactically invalid query
 * Form validates ES|QL syntax automatically
 */
export const WithSyntaxError: DynamicStory = {
  args: {
    services: mockServices,
    query: 'FROM |',
    push: true,
    onClose: action('onClose'),
  },
};

// =============================================================================
// Composable Pattern (Advanced)
// Use RuleFormFlyout as a presentation wrapper with your own form
// =============================================================================

type ComposableStory = StoryObj<typeof RuleFormFlyout>;

/**
 * Composable: RuleFormFlyout is a pure presentation wrapper.
 * You provide the form component and control onSubmit directly.
 */
export const ComposableDynamic: ComposableStory = {
  render: () => (
    <RuleFormFlyout push={true} onClose={action('onClose')} isLoading={false}>
      <DynamicRuleForm
        onSubmit={action('onSubmit')}
        query="FROM logs-* | STATS count = COUNT(*) BY host.name"
        services={mockFormServices}
      />
    </RuleFormFlyout>
  ),
};

/**
 * Composable: Dynamic form in overlay (non-push) flyout mode
 */
export const OverlayMode: ComposableStory = {
  render: () => (
    <RuleFormFlyout push={false} onClose={action('onClose')} isLoading={false}>
      <DynamicRuleForm
        onSubmit={action('onSubmit')}
        query="FROM logs-*"
        services={mockFormServices}
      />
    </RuleFormFlyout>
  ),
};
