/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { DetailsAndArtifactsStep } from '../compose_discover_form/details_and_artifacts_step';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { DELAY_MODE, type FormValues } from '../../../form/types';

const defaultValues: FormValues = {
  kind: 'alert',
  metadata: {
    name: 'CPU spike',
    enabled: true,
    description: '',
    tags: ['production'],
  },
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  query: { format: 'standalone', breach: { query: '' } },
  stateTransitionAlertDelayMode: DELAY_MODE.immediate,
  stateTransitionRecoveryDelayMode: DELAY_MODE.immediate,
};

const stubServices = {
  http: {
    get: async () => ({ tags: ['production', 'infra'] }),
  },
  dashboard: {
    findDashboardsService: async () => ({
      search: async () => ({ data: [], meta: { page: 1, per_page: 100, total: 0 } }),
      findByIds: async () => [],
    }),
  },
} as unknown as RuleFormServices;

const DetailsAndArtifactsStory = () => {
  const methods = useForm<FormValues>({ defaultValues });

  return (
    <FormProvider {...methods}>
      <RuleFormProvider services={stubServices} meta={{ layout: 'flyout' }}>
        <div style={{ maxWidth: 480 }}>
          <DetailsAndArtifactsStep />
        </div>
      </RuleFormProvider>
    </FormProvider>
  );
};

const meta: Meta<typeof DetailsAndArtifactsStory> = {
  title: 'Alerting V2/Compose Discover/Optional Labels',
  component: DetailsAndArtifactsStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DetailsAndArtifactsStory>;

export const DetailsAndArtifacts: Story = {};
