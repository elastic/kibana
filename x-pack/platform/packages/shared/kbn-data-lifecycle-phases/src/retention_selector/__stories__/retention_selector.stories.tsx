/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { RetentionSelector } from '../retention_selector';
import type { RetentionOption } from '../types';

// Edit Data Lifecycle flyout — ILM policies only, no badge, inspect available on each.
const ILM_OPTIONS: RetentionOption[] = [
  {
    name: '.alerts-ilm-policy',
    descriptionParts: ['60d', '4 data phases', '2 downsample steps'],
    inspectable: true,
  },
  {
    name: '.amet-illium-dolor',
    descriptionParts: ['60d', '3 data phases', '1 downsample step'],
    inspectable: true,
  },
  {
    name: '.amet-ipsum-dolor',
    descriptionParts: ['∞', '1 data phase'],
    inspectable: true,
  },
  {
    name: '.consectetur-adipiscing-elit',
    descriptionParts: ['60d', '4 data phases', '2 downsample steps'],
    inspectable: true,
  },
  {
    name: '.dolor-sit-amet',
    descriptionParts: ['60d', '3 data phases'],
    inspectable: true,
  },
  {
    name: '.ea-ipsum-duis',
    descriptionParts: ['365d', '3 data phases'],
    inspectable: true,
  },
];

// Import from another stream flyout — mixed DLM and ILM streams.
// Title is always the stream name. ILM entries carry a badge and an inspect button.
// DLM entries show their retention value; no badge, no inspect.
const STREAM_OPTIONS: RetentionOption[] = [
  {
    name: 'logs-elastic_agent-default',
    descriptionCategory: 'Success',
    descriptionParts: ['60d', '3 phases', '2 downsamples'],
    descriptionCategorySecondLine: 'Fail',
    descriptionPartsSecondLine: ['60d', '3 phases'],
    badge: 'ILM',
    inspectable: true,
  },
  { name: 'logs-synth-default', descriptionParts: ['60d'] },
  { name: 'logs.ecs', descriptionParts: ['∞', '1 downsample step'] },
  {
    name: 'metrics-hostmetrics-default',
    descriptionParts: ['.alerts-ilm-policy'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'profiling-events-5pow01',
    descriptionParts: ['.amet-illium-dolor'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'profiling-events-5pow02',
    descriptionParts: ['.amet-ipsum-dolor'],
    badge: 'ILM',
    inspectable: true,
  },
  {
    name: 'logs.ecs.android',
    descriptionParts: ['60d'],
    descriptionPartsSecondLine: ['3 data phases', '2 downsample steps'],
  },
  { name: 'logs.ecs.linux', descriptionParts: ['60d'] },
  { name: 'logs.ecs.windows', descriptionParts: ['365d'] },
  { name: 'logs.otel', descriptionParts: ['60d'] },
  { name: 'logs.otel.android', descriptionParts: ['∞'] },
  { name: 'logs.otel.linux', descriptionParts: ['60d'] },
  { name: 'logs.otel.windows', descriptionParts: ['90d'] },
];

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiText size="s">
      <strong>{title}</strong>
    </EuiText>
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
);

const meta: Meta<typeof RetentionSelector> = {
  title: 'Data Lifecycle Phases / Retention Selector',
  component: RetentionSelector,
};

export default meta;
type Story = StoryObj<typeof RetentionSelector>;

const IlmPoliciesExample = () => {
  const [selected, setSelected] = useState(ILM_OPTIONS[0].name);

  return (
    <>
      <Panel title="Default">
        <RetentionSelector
          options={ILM_OPTIONS}
          selectedOptionName={selected}
          onSelectOption={setSelected}
          onInspect={action('onInspect')}
          searchPlaceholder="Search by policy name"
          inspectButtonLabel={(name) => `Inspect '${name}'`}
        />
      </Panel>

      <EuiSpacer size="m" />

      <Panel title="Disabled">
        <RetentionSelector
          options={ILM_OPTIONS}
          selectedOptionName={selected}
          onSelectOption={setSelected}
          onInspect={action('onInspect')}
          isDisabled
          searchPlaceholder="Search by policy name"
          inspectButtonLabel={(name) => `Inspect '${name}'`}
        />
      </Panel>
    </>
  );
};

export const IlmPolicies: Story = {
  name: 'ILM policies (Edit Data Lifecycle)',
  render: () => <IlmPoliciesExample />,
};

const IlmPoliciesInheritedExample = () => {
  const inheritedPolicyName = ILM_OPTIONS[0].name;
  const inheritedOptions = ILM_OPTIONS.filter((o) => o.name === inheritedPolicyName);

  return (
    <Panel title="Inherited (read-only single policy)">
      <RetentionSelector
        options={inheritedOptions}
        selectedOptionName={inheritedPolicyName}
        onSelectOption={action('onSelectOption')}
        onInspect={action('onInspect')}
        isDisabled
        showSearch={false}
        listStyle="panel"
        showRowActions={false}
        searchPlaceholder="Search by policy name"
        inspectButtonLabel={(name) => `Inspect '${name}'`}
      />
    </Panel>
  );
};

export const IlmPoliciesInheritedReadOnly: Story = {
  name: 'ILM policies — inherited (read-only)',
  render: () => <IlmPoliciesInheritedExample />,
};

const StreamsExample = () => {
  const [selected, setSelected] = useState('logs.otel');

  return (
    <>
      <Panel title="Default">
        <RetentionSelector
          options={STREAM_OPTIONS}
          selectedOptionName={selected}
          onSelectOption={setSelected}
          onInspect={action('onInspect')}
          searchPlaceholder="Search by stream name"
          inspectButtonLabel={(name) => `Inspect ILM policy for '${name}'`}
          inspectPlacement="badge"
        />
      </Panel>

      <EuiSpacer size="m" />

      <Panel title="Disabled">
        <RetentionSelector
          options={STREAM_OPTIONS}
          selectedOptionName={selected}
          onSelectOption={setSelected}
          onInspect={action('onInspect')}
          isDisabled
          searchPlaceholder="Search by stream name"
          inspectButtonLabel={(name) => `Inspect ILM policy for '${name}'`}
          inspectPlacement="badge"
        />
      </Panel>
    </>
  );
};

export const Streams: Story = {
  name: 'Streams — DLM + ILM mixed (Import flyout)',
  render: () => <StreamsExample />,
};
