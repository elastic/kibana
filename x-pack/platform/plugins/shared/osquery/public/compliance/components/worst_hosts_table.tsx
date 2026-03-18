/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiPanel,
  EuiTitle,
  EuiBadge,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { ComplianceHostScore } from '../../../common/compliance';

interface Props {
  hosts: ComplianceHostScore[];
}

const ScoreCell: React.FC<{ value: number }> = ({ value }) => {
  const color = value >= 80 ? 'success' : value >= 60 ? 'warning' : 'danger';

  return <EuiBadge color={color}>{value}%</EuiBadge>;
};

const PassedCell: React.FC<{ value: number }> = ({ value }) => (
  <EuiText size="xs" color="success">
    {value}
  </EuiText>
);

const FailedCell: React.FC<{ value: number }> = ({ value }) => (
  <EuiText size="xs" color="danger">
    {value}
  </EuiText>
);

const DateCell: React.FC<{ value: string }> = ({ value }) => (
  <>{value ? new Date(value).toLocaleString() : '—'}</>
);

const COLUMNS: Array<EuiBasicTableColumn<ComplianceHostScore>> = [
  { field: 'host_name', name: 'Host', truncateText: true },
  { field: 'os_name', name: 'OS' },
  {
    field: 'score',
    name: 'Score',
    render: (val: number) => <ScoreCell value={val} />,
  },
  {
    field: 'passed',
    name: 'Passed',
    render: (val: number) => <PassedCell value={val} />,
  },
  {
    field: 'failed',
    name: 'Failed',
    render: (val: number) => <FailedCell value={val} />,
  },
  {
    field: 'last_evaluated',
    name: 'Last Evaluated',
    render: (val: string) => <DateCell value={val} />,
  },
];

export const WorstHostsTable: React.FC<Props> = ({ hosts }) => (
  <EuiPanel hasBorder>
    <EuiTitle size="xs">
      <h3>Worst Performing Hosts</h3>
    </EuiTitle>
    <EuiBasicTable items={hosts} columns={COLUMNS} tableLayout="auto" />
  </EuiPanel>
);
