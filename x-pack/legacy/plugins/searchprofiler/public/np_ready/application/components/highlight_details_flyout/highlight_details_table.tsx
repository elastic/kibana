/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiToolTip, EuiBadge } from '@elastic/eui';

import { BreakdownItem } from '../../types';
import { nsToPretty } from '../../utils';

interface Props {
  breakdown: BreakdownItem[];
}

export const HighlightDetailsTable = ({ breakdown }: Props) => {
  const columns = [
    {
      name: 'Description',
      render: (item: BreakdownItem) => (
        <EuiToolTip position="left" content={item.tip}>
          <span>{item.key}</span>
        </EuiToolTip>
      ),
    },
    {
      name: 'Time',
      render: (item: BreakdownItem) => (
        <EuiBadge style={{ backgroundColor: item.color }}>
          <span>{nsToPretty(item.time, 1)}</span>
        </EuiBadge>
      ),
    },
    {
      name: 'Percentage',
      render: (item: BreakdownItem) => (
        <EuiBadge
          className="prfDevTool__profileTree__progress--percent euiTextAlign--center"
          style={{ '--prfDevToolProgressPercentage': item.relative + '%' } as any}
        >
          <span
            className="prfDevTool__progress--percent-ie"
            style={{ width: item.relative + '%' }}
          />
          <span className="prfDevTool__progressText">{item.relative + ' %'}</span>
        </EuiBadge>
      ),
    },
  ];

  return <EuiBasicTable items={breakdown} columns={columns} />;
};
