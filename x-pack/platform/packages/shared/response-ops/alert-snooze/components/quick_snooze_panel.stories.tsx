/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiCallOut, EuiPanel, EuiSpacer } from '@elastic/eui';
import { QuickSnoozePanel } from './quick_snooze_panel';

const meta: Meta<typeof QuickSnoozePanel> = {
  component: QuickSnoozePanel,
  title: 'ResponseOps/AlertSnooze/QuickSnoozePanel',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof QuickSnoozePanel>;

const InteractiveWrapper = () => {
  const [scheduleState, setScheduleState] = useState<{
    endDate: string | null | undefined;
    label: string;
  }>({ endDate: null, label: 'Snoozed indefinitely' });

  const handleChange = useCallback((endDate: string | null | undefined) => {
    if (endDate === undefined) {
      setScheduleState({ endDate: undefined, label: 'Invalid selection (snooze button disabled)' });
    } else if (endDate === null) {
      setScheduleState({ endDate: null, label: 'Snoozed indefinitely' });
    } else {
      setScheduleState({
        endDate,
        label: `Alert will unsnooze at: ${new Date(endDate).toLocaleString()}`,
      });
    }
  }, []);

  return (
    <EuiPanel paddingSize="m">
      <QuickSnoozePanel onScheduleChange={handleChange} />
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color={scheduleState.endDate === undefined ? 'warning' : 'success'}
        title={scheduleState.label}
        iconType={scheduleState.endDate === undefined ? 'alert' : 'clock'}
      />
    </EuiPanel>
  );
};

/**
 * The default preset selection with quick duration buttons (indefinitely, 1h, 8h, 24h)
 * and a custom option that reveals the duration/datetime picker.
 */
export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

/**
 * Demonstrates the full panel embedded inside a popover-like container,
 * mirroring the real usage in the alerts table snooze action.
 */
export const InPopover: Story = {
  render: () => (
    <div
      style={{
        display: 'inline-block',
        border: '1px solid #D3DAE6',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,.15)',
        padding: 16,
        minWidth: 360,
      }}
    >
      <QuickSnoozePanel onScheduleChange={() => {}} />
    </div>
  ),
};
