/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { NotificationPolicyForm } from './notification_policy_form';
import type { NotificationPolicyFormState } from './types';

interface NotificationPolicyFormStoryProps {
  defaultValues: NotificationPolicyFormState;
}

const NotificationPolicyFormStory = ({ defaultValues }: NotificationPolicyFormStoryProps) => {
  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <NotificationPolicyForm />
    </FormProvider>
  );
};

const meta: Meta<typeof NotificationPolicyFormStory> = {
  title: 'Alerting V2/Notification Policy/Form',
  component: NotificationPolicyFormStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof NotificationPolicyFormStory>;

export const CreateMode: Story = {
  args: {
    defaultValues: {
      ...DEFAULT_FORM_STATE,
      groupBy: [...DEFAULT_FORM_STATE.groupBy],
      destinations: DEFAULT_FORM_STATE.destinations.map((destination) => ({ ...destination })),
    },
  },
};

export const EditMode: Story = {
  args: {
    defaultValues: {
      name: 'Critical production alerts',
      description: 'Routes critical production alerts to escalation workflows',
      matcher: 'data.severity : "critical" and data.env : "prod"',
      groupingMode: 'per_field',
      groupBy: ['host.name', 'service.name'],
      throttleStrategy: 'time_interval',
      throttleInterval: '5m',
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
    },
  },
};

export const PerEpisodeWithInterval: Story = {
  args: {
    defaultValues: {
      name: 'Status change with reminders',
      description: 'Notifies on status change and repeats every hour',
      matcher: '',
      groupingMode: 'per_episode',
      groupBy: [],
      throttleStrategy: 'per_status_interval',
      throttleInterval: '1h',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    },
  },
};

export const DigestMode: Story = {
  args: {
    defaultValues: {
      name: 'Digest summary',
      description: 'Bundles all episodes into a single digest',
      matcher: '',
      groupingMode: 'all',
      groupBy: [],
      throttleStrategy: 'time_interval',
      throttleInterval: '15m',
      destinations: [{ type: 'workflow', id: 'workflow-3' }],
    },
  },
};
