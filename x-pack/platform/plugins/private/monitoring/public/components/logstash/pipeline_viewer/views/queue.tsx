/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, EuiText, UseEuiTheme } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { StatementListHeading } from './statement_list_heading';

const queueMessageStyle = (theme: UseEuiTheme) => css`
  margin-left: ${theme.euiTheme.size.l};
  color: ${theme.euiTheme.colors.darkShade};
`;

export function Queue() {
  return (
    <div>
      <StatementListHeading iconType="logstashQueue" title="Queue" />
      <EuiSpacer size="s" />
      <EuiText css={queueMessageStyle}>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.queue.noMetricsDescription"
          defaultMessage="Queue metrics not available"
        />
      </EuiText>
    </div>
  );
}
