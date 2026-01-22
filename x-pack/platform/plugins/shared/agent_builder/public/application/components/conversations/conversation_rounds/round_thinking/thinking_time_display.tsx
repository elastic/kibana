/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export const ThinkingTimeDisplay = ({ timeToFirstToken }: { timeToFirstToken: number }) => {
  if (timeToFirstToken === 0) {
    return null;
  }
  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.agentBuilder.thinkingTimeDisplay.totalReasoningTime"
          defaultMessage="Total reasoning time"
        />
      }
    >
      <EuiFlexGroup
        responsive={false}
        direction="row"
        gutterSize="s"
        alignItems="center"
        css={css`
          flex-grow: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.agentBuilder.conversation.thinking.timeToFirstToken"
              defaultMessage="{timeToFirstToken} seconds"
              values={{
                timeToFirstToken: Math.round(timeToFirstToken / 1000),
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
