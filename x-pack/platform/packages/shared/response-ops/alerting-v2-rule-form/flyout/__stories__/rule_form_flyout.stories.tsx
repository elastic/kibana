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
import { StandaloneRuleFormFlyout } from '../standalone_rule_form_flyout';
import { RuleFormFlyout, RULE_FORM_ID } from '../rule_form_flyout';
import { DynamicRuleForm } from '../../form/dynamic_rule_form';
import { StandaloneRuleForm } from '../../form/standalone_rule_form';
import type { RuleFormServices } from '../../form/rule_form';

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
};

const mockFormServices: RuleFormServices = {
  http: mockServices.http,
  data: mockServices.data,
  dataViews: mockServices.dataViews,
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
type StandaloneStory = StoryObj<typeof StandaloneRuleFormFlyout>;

/**
 * DynamicRuleFormFlyout - For Discover integration
 * Syncs with external query changes while preserving user input.
 * Time field is auto-selected from available date fields.
 */
export const Dynamic: DynamicStory = {
  args: {
    services: mockServices,
    query: 'FROM logs-* | WHERE @timestamp > NOW() - 5m | STATS count = COUNT(*) BY host.name',
    isQueryInvalid: false,
    push: true,
    onClose: action('onClose'),
  },
};

/**
 * StandaloneRuleFormFlyout - For plugin integration
 * Static initialization, ignores prop changes after mount.
 * Time field is auto-selected from available date fields.
 */
export const Standalone: StandaloneStory = {
  render: () => (
    <StandaloneRuleFormFlyout
      services={mockServices}
      query="FROM metrics-* | STATS avg_cpu = AVG(system.cpu.usage)"
      push={true}
      onClose={action('onClose')}
    />
  ),
};

/**
 * Dynamic flyout with invalid query error
 */
export const WithInvalidQuery: DynamicStory = {
  args: {
    services: mockServices,
    query: 'INVALID QUERY',
    isQueryInvalid: true,
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
 * You control formId, onSubmit, and isLoading directly.
 */
export const ComposableDynamic: ComposableStory = {
  render: () => (
    <RuleFormFlyout push={true} onClose={action('onClose')} isLoading={false}>
      <DynamicRuleForm
        formId={RULE_FORM_ID}
        onSubmit={action('onSubmit')}
        query="FROM logs-* | STATS count = COUNT(*) BY host.name"
        isQueryInvalid={false}
        services={mockFormServices}
      />
    </RuleFormFlyout>
  ),
};

/**
 * Composable: Standalone form with custom flyout wrapper
 */
export const ComposableStandalone: ComposableStory = {
  render: () => (
    <RuleFormFlyout push={true} onClose={action('onClose')} isLoading={false}>
      <StandaloneRuleForm
        formId={RULE_FORM_ID}
        onSubmit={action('onSubmit')}
        query="FROM metrics-*"
        services={mockFormServices}
      />
    </RuleFormFlyout>
  ),
};

/**
 * Overlay mode (non-push flyout)
 */
export const OverlayMode: ComposableStory = {
  render: () => (
    <RuleFormFlyout push={false} onClose={action('onClose')} isLoading={false}>
      <StandaloneRuleForm
        formId={RULE_FORM_ID}
        onSubmit={action('onSubmit')}
        query="FROM logs-*"
        services={mockFormServices}
      />
    </RuleFormFlyout>
  ),
};
