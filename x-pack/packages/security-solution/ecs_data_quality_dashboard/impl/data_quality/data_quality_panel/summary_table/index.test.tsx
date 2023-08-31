/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../helpers';
import { getSummaryTableColumns } from './helpers';
import { mockIlmExplain } from '../../mock/ilm_explain/mock_ilm_explain';
import { auditbeatWithAllResults } from '../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { mockStats } from '../../mock/stats/mock_stats';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { getSummaryTableItems } from '../pattern/helpers';
import { SortConfig } from '../../types';
import { Props, SummaryTable } from '.';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const indexNames = [
  '.ds-auditbeat-8.6.1-2023.02.07-000001',
  'auditbeat-custom-empty-index-1',
  'auditbeat-custom-index-1',
  '.internal.alerts-security.alerts-default-000001',
  '.ds-packetbeat-8.5.3-2023.02.04-000001',
  '.ds-packetbeat-8.6.1-2023.02.04-000001',
];

export const defaultSort: SortConfig = {
  sort: {
    direction: 'desc',
    field: 'docsCount',
  },
};

const pattern = 'auditbeat-*';

const items = getSummaryTableItems({
  ilmExplain: mockIlmExplain,
  indexNames: indexNames ?? [],
  isILMAvailable: true,
  pattern,
  patternDocsCount: auditbeatWithAllResults?.docsCount ?? 0,
  results: auditbeatWithAllResults?.results,
  sortByColumn: defaultSort.sort.field,
  sortByDirection: defaultSort.sort.direction,
  stats: mockStats,
});

const defaultProps: Props = {
  formatBytes,
  formatNumber,
  getTableColumns: getSummaryTableColumns,
  itemIdToExpandedRowMap: {},
  items,
  pageIndex: 0,
  pageSize: 10,
  pattern,
  setPageIndex: jest.fn(),
  setPageSize: jest.fn(),
  setSorting: jest.fn(),
  sorting: defaultSort,
  toggleExpanded: jest.fn(),
};

describe('SummaryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestProviders>
        <SummaryTable {...defaultProps} />
      </TestProviders>
    );
  });

  test('it renders the summary table', () => {
    expect(screen.getByTestId('summaryTable')).toBeInTheDocument();
  });
});
