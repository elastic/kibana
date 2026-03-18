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
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { ComplianceSectionScore } from '../../../common/compliance';

interface Props {
  sections: ComplianceSectionScore[];
}

const SectionScoreCell: React.FC<{ item: ComplianceSectionScore }> = ({ item }) => {
  const color = item.score >= 80 ? 'success' : item.score >= 60 ? 'warning' : 'danger';

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <EuiProgress value={item.score} max={100} color={color} size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{item.score}%</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
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

const COLUMNS: Array<EuiBasicTableColumn<ComplianceSectionScore>> = [
  { field: 'section', name: 'CIS Section', width: '35%' },
  {
    field: 'score',
    name: 'Compliance',
    width: '45%',
    render: (_: unknown, item: ComplianceSectionScore) => <SectionScoreCell item={item} />,
  },
  {
    field: 'passed',
    name: 'Passed',
    width: '10%',
    render: (val: number) => <PassedCell value={val} />,
  },
  {
    field: 'failed',
    name: 'Failed',
    width: '10%',
    render: (val: number) => <FailedCell value={val} />,
  },
];

export const ComplianceBySectionTable: React.FC<Props> = ({ sections }) => (
  <EuiPanel hasBorder>
    <EuiTitle size="xs">
      <h3>Compliance by CIS Section</h3>
    </EuiTitle>
    <EuiBasicTable items={sections} columns={COLUMNS} tableLayout="auto" />
  </EuiPanel>
);
