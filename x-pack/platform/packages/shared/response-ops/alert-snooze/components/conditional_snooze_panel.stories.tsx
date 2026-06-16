/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { StoryObj } from '@storybook/react';
import { EuiText, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConditionalSnoozePanel, type ConditionalSnoozeSchedule } from './conditional_snooze_panel';

const meta = {
  title: 'ResponseOps/AlertSnooze/ConditionalSnoozePanel',
};

export default meta;

const DefaultStory = () => {
  const [schedule, setSchedule] = useState<ConditionalSnoozeSchedule | undefined>(undefined);

  return (
    <IntlProvider locale="en">
      <div style={{ maxWidth: 440, padding: 16, border: '1px solid #D3DAE6', borderRadius: 6 }}>
        <ConditionalSnoozePanel onScheduleChange={setSchedule} />
      </div>
      <EuiSpacer size="m" />
      <div style={{ maxWidth: 440 }}>
        <EuiText size="s">
          <strong>Emitted Schedule:</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" paddingSize="s" isCopyable>
          {JSON.stringify(schedule, null, 2)}
        </EuiCodeBlock>
      </div>
    </IntlProvider>
  );
};

export const Default: StoryObj<typeof DefaultStory> = {
  args: {},
  render: DefaultStory,
};
