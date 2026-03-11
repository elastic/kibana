/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type {
  TemplateListItem as IndexTemplate,
  SimulateIndexTemplateResponse,
} from '@kbn/index-management-shared-types';

import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';
import type { StreamNameValidator, IlmPolicyFetcher, SimulatedTemplateFetcher } from '../../utils';

const MOCK_TEMPLATES: IndexTemplate[] = [
  {
    name: 'behavioral_analytics-events-default',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['behavioral_analytics-events-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'ilm-history-7',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['ilm-history-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-activemq.audit',
    indexPatterns: ['logs-activemq.audit-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 14, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-activemq.log',
    indexPatterns: ['logs-activemq.log-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-akamai.siem',
    indexPatterns: ['logs-akamai.siem-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-apache.access',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-apache.access-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    indexMode: 'standard',
    composedOf: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-apache.error',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-apache.error-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-apm.app@template',
    indexPatterns: ['logs-apm.app-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-apm.error@template',
    indexPatterns: ['logs-apm.error-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-auditd.log',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-auditd.log-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-auditd.log-and-more-text-here-to-make-it-longer',
    ilmPolicy: { name: 'ilm-policy-with-a-long-name-and-more-text-here-to-make-it-longer' },
    indexPatterns: ['logs-auditd.log-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-auditd_manager.auditd',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['logs-auditd_manager.auditd-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-cloud_security_posture.findings',
    indexPatterns: ['logs-cloud_security_posture.findings-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-cloud_security_posture.scores',
    indexPatterns: ['logs-cloud_security_posture.scores-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 90, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-cloud_security_posture.vulnerabilities',
    indexPatterns: ['logs-cloud_security_posture.vulnerabilities-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-docker.container_logs',
    ilmPolicy: { name: '.monitoring-8-ilm-policy' },
    indexPatterns: ['logs-docker.container_logs-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-elastic_agent',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-elastic_agent-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-elastic_agent.apm_server',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-elastic_agent.apm_server-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    indexMode: 'standard',
    composedOf: [
      '.fleet_agent_id_verification-1',
      '.fleet_globals-1',
      'logs@mappings',
      'logs@settings',
      'ecs@mappings',
    ],
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-elastic_agent.auditbeat',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['logs-elastic_agent.auditbeat-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-elastic_agent.cloud_defend',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-elastic_agent.cloud_defend-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-elastic_agent.cloudbeat',
    indexPatterns: ['logs-elastic_agent.cloudbeat-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 90, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'logs-infinite-retention',
    indexPatterns: ['logs-infinite-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    indexMode: 'logsdb',
    lifecycle: { enabled: true, infiniteDataRetention: true },
    composedOf: ['logs@mappings'],
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'multi-pattern-template',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['*-logs-*-*', 'logs-*-data-*', 'metrics-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    indexMode: 'lookup',
    version: 12,
    composedOf: [
      '.fleet_agent_id_verification-1',
      '.fleet_globals-1',
      'ecs@mappings',
      'elastic_agent@custom',
      'logs@custom',
      'logs@mappings',
      'logs@settings',
      'logs-elastic_agent.apm_server@custom',
      'logs-elastic_agent.apm_server@package',
    ],
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
  {
    name: 'very-long-pattern-template',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['*-reallllllllllllllllllly-*-loooooooooooong-*-index-*-name-*', 'short-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    indexMode: 'lookup',
    version: 12,
    composedOf: [
      '.fleet_agent_id_verification-1',
      '.fleet_globals-1',
      'ecs@mappings',
      'elastic_agent@custom',
      'logs@custom',
      'logs@mappings',
      'logs@settings',
      'logs-elastic_agent.apm_server@custom',
      'logs-elastic_agent.apm_server@package',
    ],
    _kbnMeta: { type: 'managed', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  },
];

const meta: Meta<typeof CreateClassicStreamFlyout> = {
  component: CreateClassicStreamFlyout,
  title: 'Create Classic Stream Flyout',
};

export default meta;
type Story = StoryObj<typeof CreateClassicStreamFlyout>;

// Mock validation data for stories
const EXISTING_STREAM_NAMES = [
  'foo-logs-bar-baz', // Matches *-logs-*-* pattern with foo, bar, baz
  'test-logs-data-stream',
  'logs-myapp-data-production',
];

const HIGHER_PRIORITY_PATTERNS = [
  'foo-logs-bar-*', // Matches foo-logs-bar-anything
  'test-logs-*-stream',
];

/**
 * Mock ILM policies for demonstrating ILM phase display
 */
const MOCK_ILM_POLICIES: Record<string, PolicyFromES> = {
  logs: {
    name: 'logs',
    modifiedDate: '2024-01-01T00:00:00.000Z',
    version: 1,
    policy: {
      name: 'logs',
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '7d' } },
        },
        warm: {
          min_age: '7d',
          actions: {},
        },
        cold: {
          min_age: '14d',
          actions: {},
        },
        frozen: {
          min_age: '44d',
          actions: {},
        },
        delete: {
          min_age: '74d',
          actions: { delete: {} },
        },
      },
    },
  },
  'profiling-60-days': {
    name: 'profiling-60-days',
    modifiedDate: '2024-01-01T00:00:00.000Z',
    version: 1,
    policy: {
      name: 'profiling-60-days',
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '30d' } },
        },
        delete: {
          min_age: '60d',
          actions: { delete: {} },
        },
      },
    },
  },
  '.alerts-ilm-policy': {
    name: '.alerts-ilm-policy',
    modifiedDate: '2024-01-01T00:00:00.000Z',
    version: 1,
    policy: {
      name: '.alerts-ilm-policy',
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '90d' } },
        },
        warm: {
          min_age: '30d',
          actions: {},
        },
        delete: {
          min_age: '180d',
          actions: { delete: {} },
        },
      },
    },
  },
  '.monitoring-8-ilm-policy': {
    name: '.monitoring-8-ilm-policy',
    modifiedDate: '2024-01-01T00:00:00.000Z',
    version: 1,
    policy: {
      name: '.monitoring-8-ilm-policy',
      phases: {
        hot: {
          min_age: '0ms',
          actions: {},
        },
        delete: {
          min_age: '7d',
          actions: { delete: {} },
        },
      },
    },
  },
  'ilm-policy-with-a-long-name-and-more-text-here-to-make-it-longer': {
    name: 'ilm-policy-with-a-long-name-and-more-text-here-to-make-it-longer',
    modifiedDate: '2024-01-01T00:00:00.000Z',
    version: 1,
    policy: {
      name: 'ilm-policy-with-a-long-name-and-more-text-here-to-make-it-longer',
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '7d' } },
        },
        warm: {
          min_age: '7d',
          actions: {},
        },
        cold: {
          min_age: '30d',
          actions: {},
        },
        delete: {
          min_age: '90d',
          actions: { delete: {} },
        },
      },
    },
  },
};

const createSimulatedTemplateResponse = (
  indexMode: string = 'standard',
  ilmPolicyName?: string
): SimulateIndexTemplateResponse => ({
  template: {
    aliases: {},
    mappings: {},
    settings: {
      index: {
        mode: indexMode,
        ...(ilmPolicyName ? { lifecycle: { name: ilmPolicyName } } : {}),
      },
    },
  },
});

/**
 * Mock simulated template responses keyed by template name.
 * Maps template names to their simulated responses with resolved index mode and ILM policy.
 */
const MOCK_SIMULATED_TEMPLATES: Record<string, SimulateIndexTemplateResponse> = {
  'behavioral_analytics-events-default': createSimulatedTemplateResponse(
    'standard',
    'profiling-60-days'
  ),
  'ilm-history-7': createSimulatedTemplateResponse('standard', 'logs'),
  'logs-activemq.audit': createSimulatedTemplateResponse('standard'),
  'logs-activemq.log': createSimulatedTemplateResponse('standard'),
  'logs-akamai.siem': createSimulatedTemplateResponse('standard'),
  'logs-apache.access': createSimulatedTemplateResponse('standard', '.alerts-ilm-policy'),
  'logs-apache.error': createSimulatedTemplateResponse('standard', '.alerts-ilm-policy'),
  'logs-apm.app@template': createSimulatedTemplateResponse('standard'),
  'logs-apm.error@template': createSimulatedTemplateResponse('standard'),
  'logs-auditd.log': createSimulatedTemplateResponse('standard', 'profiling-60-days'),
  'logs-auditd.log-and-more-text-here-to-make-it-longer': createSimulatedTemplateResponse(
    'standard',
    'ilm-policy-with-a-long-name-and-more-text-here-to-make-it-longer'
  ),
  'logs-auditd_manager.auditd': createSimulatedTemplateResponse('standard', 'logs'),
  'logs-cloud_security_posture.findings': createSimulatedTemplateResponse('standard'),
  'logs-cloud_security_posture.scores': createSimulatedTemplateResponse('standard'),
  'logs-cloud_security_posture.vulnerabilities': createSimulatedTemplateResponse('standard'),
  'logs-docker.container_logs': createSimulatedTemplateResponse(
    'standard',
    '.monitoring-8-ilm-policy'
  ),
  'logs-elastic_agent': createSimulatedTemplateResponse('standard', 'profiling-60-days'),
  'logs-elastic_agent.apm_server': createSimulatedTemplateResponse('standard', 'profiling-60-days'),
  'logs-elastic_agent.auditbeat': createSimulatedTemplateResponse('standard', 'logs'),
  'logs-elastic_agent.cloud_defend': createSimulatedTemplateResponse(
    'standard',
    '.alerts-ilm-policy'
  ),
  'logs-elastic_agent.cloudbeat': createSimulatedTemplateResponse('standard'),
  'logs-infinite-retention': createSimulatedTemplateResponse('logsdb'),
  'multi-pattern-template': createSimulatedTemplateResponse('lookup', 'logs'),
  'very-long-pattern-template': createSimulatedTemplateResponse('lookup', 'logs'),
};

/**
 * Creates a mock simulated template fetcher that wraps fetch logic with Storybook action logging.
 */
const createMockSimulatedTemplateFetcher = (): SimulatedTemplateFetcher => {
  const onGetSimulatedTemplateAction = action('getSimulatedTemplate');

  return async (templateName: string, signal?: AbortSignal) => {
    onGetSimulatedTemplateAction(templateName);
    action('getSimulatedTemplate:start')({ templateName, timestamp: Date.now() });

    // Check if aborted before starting delay
    if (signal?.aborted) {
      action('getSimulatedTemplate:aborted')({ templateName, reason: 'aborted before delay' });
      throw new Error('Simulated template fetch aborted');
    }

    // Simulate network delay with periodic abort checks
    const delay = 300;
    const startTime = Date.now();
    while (Date.now() - startTime < delay) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (signal?.aborted) {
        action('getSimulatedTemplate:aborted')({
          templateName,
          reason: 'aborted during delay',
          elapsed: Date.now() - startTime,
        });
        throw new Error('Simulated template fetch aborted');
      }
    }

    const simulatedTemplate = MOCK_SIMULATED_TEMPLATES[templateName];
    action('getSimulatedTemplate:result')(simulatedTemplate ?? null);
    return simulatedTemplate ?? null;
  };
};

/**
 * Creates a mock ILM policy fetcher that wraps fetch logic with Storybook action logging.
 */
const createMockIlmPolicyFetcher = (): IlmPolicyFetcher => {
  const onGetIlmPolicyAction = action('getIlmPolicy');

  return async (policyName: string, signal?: AbortSignal) => {
    onGetIlmPolicyAction(policyName);
    action('getIlmPolicy:start')({ policyName, timestamp: Date.now() });

    // Check if aborted before starting delay
    if (signal?.aborted) {
      action('getIlmPolicy:aborted')({ policyName, reason: 'aborted before delay' });
      throw new Error('ILM policy fetch aborted');
    }

    // Simulate network delay with periodic abort checks
    const delay = 500;
    const startTime = Date.now();
    while (Date.now() - startTime < delay) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (signal?.aborted) {
        action('getIlmPolicy:aborted')({
          policyName,
          reason: 'aborted during delay',
          elapsed: Date.now() - startTime,
        });
        throw new Error('ILM policy fetch aborted');
      }
    }

    const policy = MOCK_ILM_POLICIES[policyName];
    action('getIlmPolicy:result')(policy ?? null);
    return policy ?? null;
  };
};

/**
 * Creates a mock validator that wraps validation logic with Storybook action logging.
 * You'll see "onValidate" events in the Actions panel whenever validation is triggered.
 */
const createMockValidator = (
  existingNames: string[],
  higherPriorityPatterns: string[],
  delayMs: number = 500
): StreamNameValidator => {
  const onValidateAction = action('onValidate');

  return async (streamName: string, selectedTemplate: IndexTemplate, signal?: AbortSignal) => {
    // Log the validation call to Storybook actions panel
    onValidateAction({ streamName, template: selectedTemplate.name });
    action('onValidate:start')({
      streamName,
      template: selectedTemplate.name,
      timestamp: Date.now(),
    });

    // Simulate network delay (configurable for testing race conditions)
    const delay = delayMs;

    // Check if aborted before starting delay
    if (signal?.aborted) {
      action('onValidate:aborted')({
        streamName,
        template: selectedTemplate.name,
        reason: 'aborted before delay',
      });
      throw new Error('Validation aborted');
    }

    // Wait with periodic abort checks
    const startTime = Date.now();
    while (Date.now() - startTime < delay) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (signal?.aborted) {
        action('onValidate:aborted')({
          streamName,
          template: selectedTemplate.name,
          reason: 'aborted during delay',
          elapsed: Date.now() - startTime,
        });
        throw new Error('Validation aborted');
      }
    }

    // Check for duplicate
    if (existingNames.includes(streamName)) {
      const result = { errorType: 'duplicate' as const, conflictingIndexPattern: undefined };
      action('onValidate:result')({
        streamName,
        template: selectedTemplate.name,
        result,
      });
      return result;
    }

    // Check for higher priority pattern conflict
    for (const pattern of higherPriorityPatterns) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(streamName)) {
        const result = { errorType: 'higherPriority' as const, conflictingIndexPattern: pattern };
        action('onValidate:result')({
          streamName,
          template: selectedTemplate.name,
          result,
        });
        return result;
      }
    }

    const result = { errorType: null, conflictingIndexPattern: undefined };
    action('onValidate:result')({
      streamName,
      template: selectedTemplate.name,
      result,
    });
    return result;
  };
};

export const Default: Story = {
  render: () => (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={async (name) => action('onCreate')(name)}
      onCreateTemplate={action('onCreateTemplate')}
      onRetryLoadTemplates={action('onRetryLoadTemplates')}
      templates={MOCK_TEMPLATES}
      getIlmPolicy={createMockIlmPolicyFetcher()}
      getSimulatedTemplate={createMockSimulatedTemplateFetcher()}
    />
  ),
};

/**
 * Tests all validation scenarios. Watch the Actions panel to see when `onValidate` is triggered:
 * - Empty fields: Leave any wildcard empty and click Create
 * - Duplicate: Select "multi-pattern-template", enter "foo", "bar", "baz" to trigger duplicate validation
 * - Higher priority: Enter "foo", "bar", then anything (e.g., "test") to trigger higher priority conflict
 *
 * Uses 500ms delay (normal network conditions).
 */
export const WithValidation: Story = {
  render: () => {
    const validator = createMockValidator(EXISTING_STREAM_NAMES, HIGHER_PRIORITY_PATTERNS, 500);
    return (
      <CreateClassicStreamFlyout
        onClose={action('onClose')}
        onCreate={async (name) => action('onCreate')(name)}
        onCreateTemplate={action('onCreateTemplate')}
        onRetryLoadTemplates={action('onRetryLoadTemplates')}
        templates={MOCK_TEMPLATES}
        onValidate={validator}
        getIlmPolicy={createMockIlmPolicyFetcher()}
        getSimulatedTemplate={createMockSimulatedTemplateFetcher()}
      />
    );
  },
};

/**
 * Tests race condition scenarios with very slow network (2500ms delay).
 *
 * To test the debounce bug:
 * 1. Select "multi-pattern-template" template and go to name step
 * 2. Type "foo", "bar", "baz" in the inputs
 * 3. Click Create button - validation starts (5s delay)
 * 4. While validation is running, quickly backspace "baz" to "ba"
 * 5. Observe: Create button loader stops (isSubmitting becomes false)
 * 6. Quickly backspace again from "ba" to "b"
 * 7. Bug: No validation is triggered, but async request eventually completes
 */
export const WithSlowValidation: Story = {
  render: () => {
    const validator = createMockValidator(EXISTING_STREAM_NAMES, HIGHER_PRIORITY_PATTERNS, 2500);
    return (
      <CreateClassicStreamFlyout
        onClose={action('onClose')}
        onCreate={async (name) => action('onCreate')(name)}
        onCreateTemplate={action('onCreateTemplate')}
        onRetryLoadTemplates={action('onRetryLoadTemplates')}
        templates={MOCK_TEMPLATES}
        onValidate={validator}
        getIlmPolicy={createMockIlmPolicyFetcher()}
        getSimulatedTemplate={createMockSimulatedTemplateFetcher()}
      />
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={async (name) => action('onCreate')(name)}
      onCreateTemplate={action('onCreateTemplate')}
      onRetryLoadTemplates={action('onRetryLoadTemplates')}
      templates={[]}
    />
  ),
};

export const ErrorState: Story = {
  render: () => (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={async (name) => action('onCreate')(name)}
      onCreateTemplate={action('onCreateTemplate')}
      onRetryLoadTemplates={action('onRetryLoadTemplates')}
      templates={[]}
      hasErrorLoadingTemplates={true}
    />
  ),
};
