/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { SnoozeDurationPicker } from './snooze_duration_picker';
import type { CustomDurationState } from './types';

const meta: Meta<typeof SnoozeDurationPicker> = {
  component: SnoozeDurationPicker,
  title: 'ResponseOps/AlertSnooze/SnoozeDurationPicker',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SnoozeDurationPicker>;

const initialDurationState: CustomDurationState = {
  mode: 'duration',
  value: 1,
  unit: 'h',
  dateTime: null,
};

const initialDateTimeState: CustomDurationState = {
  mode: 'datetime',
  value: 1,
  unit: 'h',
  dateTime: null,
};

const InteractiveWrapper = ({ initialState }: { initialState: CustomDurationState }) => {
  const [state, setState] = useState<CustomDurationState>(initialState);

  const handleChange = (update: Partial<CustomDurationState>) => {
    setState((prev) => ({ ...prev, ...update }));
  };

  return (
    <EuiPanel paddingSize="m">
      <SnoozeDurationPicker value={state} onChange={handleChange} />
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state, null, 2)}</pre>
      </EuiText>
    </EuiPanel>
  );
};

/**
 * Duration mode: enter a numeric value and select a unit (minutes, hours, days, weeks, months).
 */
export const DurationMode: Story = {
  render: () => <InteractiveWrapper initialState={initialDurationState} />,
};

/**
 * Date & time mode: pick a specific future date and time for the snooze to expire.
 */
export const DateTimeMode: Story = {
  render: () => <InteractiveWrapper initialState={initialDateTimeState} />,
};

/**
 * Shows the invalid state when the duration value is below the minimum (< 1).
 */
export const InvalidDuration: Story = {
  render: () => (
    <EuiPanel paddingSize="m">
      <SnoozeDurationPicker
        value={{ mode: 'duration', value: 0, unit: 'h', dateTime: null }}
        onChange={() => {}}
        isDurationInvalid
      />
    </EuiPanel>
  ),
};

/**
 * Shows the invalid state when a past date/time is selected.
 */
export const InvalidDateTime: Story = {
  render: () => (
    <EuiPanel paddingSize="m">
      <SnoozeDurationPicker
        value={{ mode: 'datetime', value: 1, unit: 'h', dateTime: null }}
        onChange={() => {}}
        isDateTimeInvalid
      />
    </EuiPanel>
  ),
};
