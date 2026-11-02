/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { InspectIlmPolicyFlyout } from '@kbn/data-lifecycle-phases';
import { IMPORT_METHOD_DLM, IMPORT_METHOD_ILM } from './constants';
import type { ImportLifecycleMethod } from './constants';
import { ImportLifecycleFlyout } from './import_lifecycle_flyout';
import type { ImportLifecycleOption } from './types';

interface ImportLifecycleStoryOption extends ImportLifecycleOption {
  ilmPolicyName?: string;
}

const buildIlmPolicy = ({
  name,
  warmMinAge,
  deleteMinAge,
  downsampleInterval,
}: {
  name: string;
  warmMinAge: string;
  deleteMinAge: string;
  downsampleInterval?: string;
}): SerializedPolicy => ({
  name,
  phases: {
    hot: {
      min_age: '0ms',
      actions: {
        rollover: { max_primary_shard_size: '50gb', max_age: '30d' },
        set_priority: { priority: 100 },
      },
    },
    warm: {
      min_age: warmMinAge,
      actions: {
        readonly: {},
        ...(downsampleInterval ? { downsample: { fixed_interval: downsampleInterval } } : {}),
        set_priority: { priority: 50 },
      },
    },
    delete: {
      min_age: deleteMinAge,
      actions: {
        delete: {},
      },
    },
  },
});

const ILM_POLICIES: Record<string, SerializedPolicy> = {
  'logs-elastic-agent-policy': buildIlmPolicy({
    name: 'logs-elastic-agent-policy',
    warmMinAge: '30d',
    deleteMinAge: '60d',
    downsampleInterval: '1d',
  }),
  'metrics-hostmetrics-policy': buildIlmPolicy({
    name: 'metrics-hostmetrics-policy',
    warmMinAge: '90d',
    deleteMinAge: '365d',
  }),
  '.profiling-ilm-policy': buildIlmPolicy({
    name: '.profiling-ilm-policy',
    warmMinAge: '30d',
    deleteMinAge: '180d',
  }),
};

const STREAM_OPTIONS: ImportLifecycleStoryOption[] = [
  {
    name: 'logs-elastic_agent-default',
    method: IMPORT_METHOD_ILM,
    ilmPolicyName: 'logs-elastic-agent-policy',
    hasDownsampling: true,
    descriptionCategory: 'Success',
    descriptionParts: ['60d', '3 phases', '2 downsamples'],
    descriptionCategorySecondLine: 'Fail',
    descriptionPartsSecondLine: ['60d', '2 phases'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'logs-synth-default',
    method: IMPORT_METHOD_DLM,
    descriptionCategory: 'Success',
    descriptionParts: ['60d', '2 phases'],
  },
  {
    name: 'logs.ecs',
    method: IMPORT_METHOD_DLM,
    hasDownsampling: true,
    descriptionCategory: 'Success',
    descriptionParts: ['∞', '1 phase', '1 downsample'],
  },
  {
    name: 'metrics-hostmetrics-default',
    method: IMPORT_METHOD_ILM,
    ilmPolicyName: 'metrics-hostmetrics-policy',
    descriptionCategory: 'Success',
    descriptionParts: ['365d', '4 phases'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'profiling-events-5pow01',
    method: IMPORT_METHOD_ILM,
    ilmPolicyName: '.profiling-ilm-policy',
    descriptionCategory: 'Success',
    descriptionParts: ['.profiling-ilm-policy'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'logs.otel',
    method: IMPORT_METHOD_DLM,
    descriptionCategory: 'Success',
    descriptionParts: ['90d', '2 phases'],
    descriptionCategorySecondLine: 'Fail',
    descriptionPartsSecondLine: ['∞', '1 phase'],
  },
];

const meta: Meta<typeof ImportLifecycleFlyout> = {
  component: ImportLifecycleFlyout,
  title: 'streams/ImportLifecycleFlyout',
  argTypes: {
    titleId: { control: false },
    options: { control: false },
    selectedOptionName: { control: false },
    onSelectOption: { control: false },
    onInspect: { control: false },
    selectedMethods: { control: false },
    onChangeSelectedMethods: { control: false },
    onApply: { control: false },
    onClose: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof ImportLifecycleFlyout>;

const StatefulStory = ({
  isLoadingStreams = false,
  isApplyDisabled = false,
  canUseDownsampling = true,
}: {
  isLoadingStreams?: boolean;
  isApplyDisabled?: boolean;
  canUseDownsampling?: boolean;
}) => {
  const [selectedOptionName, setSelectedOptionName] = useState(STREAM_OPTIONS[0].name);
  const [selectedMethods, setSelectedMethods] = useState<ImportLifecycleMethod[]>([]);
  const [inspectedStreamName, setInspectedStreamName] = useState<string | null>(null);

  const inspectedOption = inspectedStreamName
    ? STREAM_OPTIONS.find(({ name }) => name === inspectedStreamName)
    : undefined;
  const inspectedPolicyName = inspectedOption?.ilmPolicyName;
  const inspectedPolicy = inspectedPolicyName ? ILM_POLICIES[inspectedPolicyName] : undefined;

  return (
    <>
      <ImportLifecycleFlyout
        titleId="streamsImportLifecycleFlyoutStoryTitle"
        options={STREAM_OPTIONS}
        selectedOptionName={selectedOptionName}
        onSelectOption={(name) => {
          action('onSelectOption')(name);
          setSelectedOptionName(name);
        }}
        onInspect={(name) => {
          action('onInspect')(name);
          setInspectedStreamName(name);
        }}
        isLoadingStreams={isLoadingStreams}
        selectedMethods={selectedMethods}
        onChangeSelectedMethods={(methods) => {
          action('onChangeSelectedMethods')(methods);
          setSelectedMethods(methods);
        }}
        onApply={action('onApply')}
        onClose={action('onClose')}
        isApplyDisabled={isApplyDisabled}
        canUseDownsampling={canUseDownsampling}
      />

      {inspectedPolicyName && inspectedPolicy ? (
        <InspectIlmPolicyFlyout
          policyName={inspectedPolicyName}
          policy={inspectedPolicy}
          onBack={() => setInspectedStreamName(null)}
          onEditPolicy={action('onEditIlmPolicy')}
          primaryAction={{
            label: 'Select policy and apply',
            onClick: (policyName) => action('onSelectAndApply')({ policyName }),
            'data-test-subj': 'inspectIlmPolicyFlyoutSelectAndApplyButton',
          }}
          type="push"
        />
      ) : null}
    </>
  );
};

export const TimeSeriesStream: Story = {
  name: 'Time-series stream',
  render: () => <StatefulStory />,
};

export const NonTimeSeriesStream: Story = {
  name: 'Non-time-series stream',
  render: () => <StatefulStory canUseDownsampling={false} />,
};
