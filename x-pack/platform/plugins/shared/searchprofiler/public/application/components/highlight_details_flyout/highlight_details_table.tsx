/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiToolTip, EuiBadge } from '@elastic/eui';

import { BreakdownItem } from '../../types';
import { nsToPretty } from '../../lib';
import { PercentageBadge } from '../percentage_badge';

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
          <span>{item.key.endsWith('_count') ? item.time : nsToPretty(item.time, 1)}</span>
        </EuiBadge>
      ),
    },
    {
      name: 'Percentage',
      render: (item: BreakdownItem) => (
        <PercentageBadge timePercentage={String(item.relative)} label={item.relative + '%'} />
      ),
    },
  ];

  return <EuiBasicTable items={breakdown} columns={columns} />;
};
