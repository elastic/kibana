/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { CreateClassicStreamFlyout, type IndexTemplate } from './create_classic_stream_flyout';

const MOCK_TEMPLATES: IndexTemplate[] = [
  {
    name: 'behavioral_analytics-events-default',
    ilmPolicy: { name: 'profiling-60-days' },
    showIlmBadge: true,
    indexPatterns: ['behavioral_analytics-events-*'],
  },
  {
    name: 'ilm-history-7',
    ilmPolicy: { name: 'logs' },
    showIlmBadge: true,
    indexPatterns: ['ilm-history-*'],
  },
  {
    name: 'logs-activemq.audit',
    ilmPolicy: { name: '14d' },
    showIlmBadge: false,
    indexPatterns: ['logs-activemq.audit-*'],
  },
  {
    name: 'logs-activemq.log',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-activemq.log-*'],
  },
  {
    name: 'logs-akamai.siem',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-akamai.siem-*'],
  },
  {
    name: 'logs-apache.access',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    showIlmBadge: true,
    indexPatterns: ['logs-apache.access-*'],
  },
  {
    name: 'logs-apache.error',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    showIlmBadge: true,
    indexPatterns: ['logs-apache.error-*'],
  },
  {
    name: 'logs-apm.app@template',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-apm.app-*'],
  },
  {
    name: 'logs-apm.error@template',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-apm.error-*'],
  },
  {
    name: 'logs-auditd.log',
    ilmPolicy: { name: 'profiling-60-days' },
    showIlmBadge: true,
    indexPatterns: ['logs-auditd.log-*'],
  },
  {
    name: 'logs-auditd_manager.auditd',
    ilmPolicy: { name: 'logs' },
    showIlmBadge: true,
    indexPatterns: ['logs-auditd_manager.auditd-*'],
  },
  {
    name: 'logs-cloud_security_posture.findings',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-cloud_security_posture.findings-*'],
  },
  {
    name: 'logs-cloud_security_posture.scores',
    ilmPolicy: { name: '90d' },
    showIlmBadge: false,
    indexPatterns: ['logs-cloud_security_posture.scores-*'],
  },
  {
    name: 'logs-cloud_security_posture.vulnerabilities',
    ilmPolicy: { name: '30d' },
    showIlmBadge: false,
    indexPatterns: ['logs-cloud_security_posture.vulnerabilities-*'],
  },
  {
    name: 'logs-docker.container_logs',
    ilmPolicy: { name: '.monitoring-8-ilm-policy' },
    showIlmBadge: true,
    indexPatterns: ['logs-docker.container_logs-*'],
  },
  {
    name: 'logs-elastic_agent',
    ilmPolicy: { name: 'profiling-60-days' },
    showIlmBadge: true,
    indexPatterns: ['logs-elastic_agent-*'],
  },
  {
    name: 'logs-elastic_agent.apm_server',
    ilmPolicy: { name: 'profiling-60-days' },
    showIlmBadge: true,
    indexPatterns: ['logs-elastic_agent.apm_server-*'],
  },
  {
    name: 'logs-elastic_agent.auditbeat',
    ilmPolicy: { name: 'logs' },
    showIlmBadge: true,
    indexPatterns: ['logs-elastic_agent.auditbeat-*'],
  },
  {
    name: 'logs-elastic_agent.cloud_defend',
    ilmPolicy: { name: '.alerts-ilm-policy' },
    showIlmBadge: true,
    indexPatterns: ['logs-elastic_agent.cloud_defend-*'],
  },
  {
    name: 'logs-elastic_agent.cloudbeat',
    ilmPolicy: { name: '90d' },
    showIlmBadge: false,
    indexPatterns: ['logs-elastic_agent.cloudbeat-*'],
  },
];

const meta: Meta<typeof CreateClassicStreamFlyout> = {
  component: CreateClassicStreamFlyout,
  title: 'Create Classic Stream Flyout',
};

export default meta;
type Story = StoryObj<typeof CreateClassicStreamFlyout>;

// Use a render function to manage the template selection state
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
