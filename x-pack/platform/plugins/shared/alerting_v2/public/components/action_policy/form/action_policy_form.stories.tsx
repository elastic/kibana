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
import { ActionPolicyForm } from './action_policy_form';
import type { ActionPolicyFormState } from './types';

interface ActionPolicyFormStoryProps {
  defaultValues: ActionPolicyFormState;
}

const ActionPolicyFormStory = ({ defaultValues }: ActionPolicyFormStoryProps) => {
  const methods = useForm<ActionPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <ActionPolicyForm />
    </FormProvider>
  );
};

const meta: Meta<typeof ActionPolicyFormStory> = {
  title: 'Alerting V2/Action Policy/Form',
  component: ActionPolicyFormStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof ActionPolicyFormStory>;

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
      tags: ['production', 'critical'],
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
      tags: [],
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
      tags: [],
      matcher: '',
      groupingMode: 'all',
      groupBy: [],
      throttleStrategy: 'time_interval',
      throttleInterval: '15m',
      destinations: [{ type: 'workflow', id: 'workflow-3' }],
    },
  },
};
