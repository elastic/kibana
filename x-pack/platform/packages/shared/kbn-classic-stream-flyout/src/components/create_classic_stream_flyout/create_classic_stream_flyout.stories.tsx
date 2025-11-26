/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';

import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const MOCK_TEMPLATES: TemplateDeserialized[] = [
  {
    name: 'behavioral_analytics-events-default',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['behavioral_analytics-events-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'ilm-history-7',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['ilm-history-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-activemq.audit',
    indexPatterns: ['logs-activemq.audit-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 14, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-activemq.log',
    indexPatterns: ['logs-activemq.log-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-akamai.siem',
    indexPatterns: ['logs-akamai.siem-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-apache.access',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-apache.access-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-apache.error',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-apache.error-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-apm.app@template',
    indexPatterns: ['logs-apm.app-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-apm.error@template',
    indexPatterns: ['logs-apm.error-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-auditd.log',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-auditd.log-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-auditd_manager.auditd',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['logs-auditd_manager.auditd-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-cloud_security_posture.findings',
    indexPatterns: ['logs-cloud_security_posture.findings-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-cloud_security_posture.scores',
    indexPatterns: ['logs-cloud_security_posture.scores-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 90, unit: 'd' },
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-cloud_security_posture.vulnerabilities',
    indexPatterns: ['logs-cloud_security_posture.vulnerabilities-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-docker.container_logs',
    ilmPolicy: { name: '.monitoring-8-ilm-policy' },
    indexPatterns: ['logs-docker.container_logs-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-elastic_agent',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-elastic_agent-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-elastic_agent.apm_server',
    ilmPolicy: { name: 'profiling-60-days' },
    indexPatterns: ['logs-elastic_agent.apm_server-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-elastic_agent.auditbeat',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['logs-elastic_agent.auditbeat-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-elastic_agent.cloud_defend',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    indexPatterns: ['logs-elastic_agent.cloud_defend-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'logs-elastic_agent.cloudbeat',
    indexPatterns: ['logs-elastic_agent.cloudbeat-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 90, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'logs-infinite-retention',
    indexPatterns: ['logs-infinite-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, infiniteDataRetention: true },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
];

const meta: Meta<typeof CreateClassicStreamFlyout> = {
  component: CreateClassicStreamFlyout,
  title: 'Create Classic Stream Flyout',
};

export default meta;
type Story = StoryObj<typeof CreateClassicStreamFlyout>;

const PrimaryStory = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={action('onCreate')}
      templates={MOCK_TEMPLATES}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={(template) => {
        action('onTemplateSelect')(template);
        setSelectedTemplate(template);
      }}
    />
  );
};

export const Primary: Story = {
  render: () => <PrimaryStory />,
};

const WithPreselectedTemplateStory = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('logs-apache.access');

  return (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={action('onCreate')}
      templates={MOCK_TEMPLATES}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={(template) => {
        action('onTemplateSelect')(template);
        setSelectedTemplate(template);
      }}
    />
  );
};

export const WithPreselectedTemplate: Story = {
  render: () => <WithPreselectedTemplateStory />,
};

const EmptyStateStory = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={action('onCreate')}
      onCreateTemplate={action('onCreateTemplate')}
      templates={[]}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={(template) => {
        action('onTemplateSelect')(template);
        setSelectedTemplate(template);
      }}
    />
  );
};

export const EmptyState: Story = {
  render: () => <EmptyStateStory />,
};

const ErrorStateStory = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <CreateClassicStreamFlyout
      onClose={action('onClose')}
      onCreate={action('onCreate')}
      templates={[]}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={(template) => {
        action('onTemplateSelect')(template);
        setSelectedTemplate(template);
      }}
      hasErrorLoadingTemplates={true}
      onRetryLoadTemplates={action('onRetryLoadTemplates')}
    />
  );
};

export const ErrorState: Story = {
  render: () => <ErrorStateStory />,
};
