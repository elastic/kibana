/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';

interface Props {
  eventType: ProcessorEvent.transaction | ProcessorEvent.span;
  totalDocCount?: number;
}

export function TotalDocCountLabel({ eventType, totalDocCount }: Props) {
  const { euiTheme } = useEuiTheme();

  if (!totalDocCount) {
    return null;
  }

  return (
    <EuiText
      size="s"
      css={css`
        border-left: ${euiTheme.border.thin};
        padding-left: ${euiTheme.size.s};
      `}
    >
      {eventType === ProcessorEvent.transaction
        ? i18n.translate(
            'xpack.apm.durationDistributionChart.totalTransactionsCount',
            {
              defaultMessage:
                '{totalDocCount} total {totalDocCount, plural, one {transaction} other {transactions}}',
              values: {
                totalDocCount,
              },
            }
          )
        : i18n.translate(
            'xpack.apm.durationDistributionChart.totalSpansCount',
            {
              defaultMessage:
                '{totalDocCount} total {totalDocCount, plural, one {span} other {spans}}',
              values: {
                totalDocCount,
              },
            }
          )}
    </EuiText>
  );
}
