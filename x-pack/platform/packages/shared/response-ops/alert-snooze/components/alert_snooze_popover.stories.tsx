/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { StoryObj } from '@storybook/react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertSnoozePopover, type AlertSnoozePayload } from './alert_snooze_popover';

const meta = {
  title: 'ResponseOps/AlertSnooze/AlertSnoozePopover',
};

export default meta;

const DefaultStory = () => {
  const [lastPayload, setLastPayload] = useState<AlertSnoozePayload | undefined>(undefined);

  return (
    <IntlProvider locale="en">
      <div style={{ padding: 16 }}>
        <AlertSnoozePopover onApply={setLastPayload} />
      </div>
      <EuiSpacer size="m" />
      <div style={{ maxWidth: 440 }}>
        <EuiText size="s">
          <strong>Last applied payload:</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" paddingSize="s" isCopyable>
          {lastPayload === undefined
            ? 'Click "Snooze alert" to apply a payload.'
            : JSON.stringify(lastPayload, null, 2)}
        </EuiCodeBlock>
      </div>
    </IntlProvider>
  );
};

export const Default: StoryObj<typeof DefaultStory> = {
  args: {},
  render: DefaultStory,
};
