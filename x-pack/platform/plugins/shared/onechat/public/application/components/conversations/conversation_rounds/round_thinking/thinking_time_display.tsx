/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export const ThinkingTimeDisplay = ({ timeToFirstToken }: { timeToFirstToken: number }) => {
  if (timeToFirstToken === 0) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText
        size="s"
        color="subdued"
        css={css`
          font-style: italic;
        `}
      >
        <FormattedMessage
          id="xpack.onechat.conversation.thinking.timeToFirstToken"
          defaultMessage="Thought for {timeToFirstToken} seconds."
          values={{
            timeToFirstToken: Math.round(timeToFirstToken / 1000),
          }}
        />
      </EuiText>
    </>
  );
};
