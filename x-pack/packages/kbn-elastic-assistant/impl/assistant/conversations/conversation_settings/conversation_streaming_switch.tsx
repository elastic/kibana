/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { STREAMING_TITLE, STREAMING_HELP_TEXT_TITLE } from './translations';

interface Props {
  assistantStreamingEnabled: boolean;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  compressed?: boolean;
}

const ConversationStreamingSwitchComponent: React.FC<Props> = ({
  assistantStreamingEnabled,
  compressed,
  setAssistantStreamingEnabled,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFormRow
      fullWidth
      display="rowCompressed"
      label={
        <EuiText
          size="xs"
          css={
            compressed
              ? undefined
              : css`
                  padding: ${euiTheme.size.m} 0;
                  font-weight: ${euiTheme.font.weight.bold};
                  line-height: ${euiTheme.size.m};
                `
          }
        >
          {STREAMING_TITLE}
        </EuiText>
      }
    >
      <EuiSwitch
        label={<EuiText size={compressed ? 'xs' : 's'}>{STREAMING_HELP_TEXT_TITLE}</EuiText>}
        checked={assistantStreamingEnabled}
        onChange={(e) => setAssistantStreamingEnabled(e.target.checked)}
        compressed={compressed}
      />
    </EuiFormRow>
  );
};

export const ConversationStreamingSwitch = React.memo(ConversationStreamingSwitchComponent);

ConversationStreamingSwitch.displayName = 'ConversationStreamingSwitch';
