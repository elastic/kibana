/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiI18nNumber, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RoundModelUsageStats } from '@kbn/onechat-common';
import React from 'react';
import { css } from '@emotion/react';

const TokenDisplay = ({ type, value }: { type: 'input' | 'output'; value: number }) => (
  <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" responsive={false}>
    <EuiIcon color="subdued" type={type === 'input' ? 'sortUp' : 'sortDown'} />
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="xpack.onechat.tokenDisplay.tokenUsage"
        defaultMessage="{value} tokens"
        values={{
          value: <EuiI18nNumber value={value} />,
        }}
      />
    </EuiText>
  </EuiFlexGroup>
);

export const InputOutputTokensDisplay = ({ modelUsage }: { modelUsage: RoundModelUsageStats }) => (
  <EuiFlexGroup
    direction="row"
    alignItems="center"
    gutterSize="s"
    responsive={false}
    css={css`
      flex-grow: 0;
    `}
  >
    <TokenDisplay type="input" value={modelUsage.input_tokens} />
    <TokenDisplay type="output" value={modelUsage.output_tokens} />
  </EuiFlexGroup>
);
