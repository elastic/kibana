/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPanel } from '@elastic/eui';
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
