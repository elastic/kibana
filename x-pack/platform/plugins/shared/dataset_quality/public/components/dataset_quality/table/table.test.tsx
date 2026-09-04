/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { Table } from './table';
import { useDatasetQualityTable } from '../../../hooks';

jest.mock('../../../hooks', () => ({
  useDatasetQualityTable: jest.fn(),
}));

const useDatasetQualityTableMock = useDatasetQualityTable as jest.MockedFunction<
  typeof useDatasetQualityTable
>;

const baseTableState: Omit<
  ReturnType<typeof useDatasetQualityTable>,
  'renderedItems' | 'loading'
> = {
  sort: { sort: { field: 'title', direction: 'asc' } },
  onTableChange: jest.fn(),
  pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 0, hidePerPageOptions: true },
  filteredItems: [],
  columns: [{ name: 'Data set name', field: 'title', render: (value: string) => value }],
  resultsCount: <strong>0</strong>,
  showInactiveDatasets: false,
  showFullDatasetNames: false,
  canUserMonitorAnyDataset: true,
  canUserMonitorAnyDataStream: true,
  toggleInactiveDatasets: jest.fn(),
  toggleFullDatasetNames: jest.fn(),
  updateFailureStore: jest.fn(),
};

const renderedItem = DataStreamStat.fromQualityStats({
  datasetName: 'logs-synth.1-default',
  degradedDocStat: { count: 0, percentage: 0 },
  failedDocStat: { count: 0, percentage: 0 },
  datasetIntegrationMap: {},
  totalDocs: 1,
});

describe('Table', () => {
  afterEach(() => {
    useDatasetQualityTableMock.mockReset();
  });

  it('renders the empty-state prompt when no data sets exist and loading has finished', () => {
    useDatasetQualityTableMock.mockReturnValue({
      ...baseTableState,
      renderedItems: [],
      loading: false,
    });

    renderWithI18n(<Table />);

    expect(screen.getByTestId('datasetQualityTableNoData')).toBeInTheDocument();
  });

  it('does not render the empty-state prompt while loading', () => {
    useDatasetQualityTableMock.mockReturnValue({
      ...baseTableState,
      renderedItems: [],
      loading: true,
    });

    renderWithI18n(<Table />);

    expect(screen.queryByTestId('datasetQualityTableNoData')).not.toBeInTheDocument();
  });

  it('does not render the empty-state prompt once data sets are present', () => {
    useDatasetQualityTableMock.mockReturnValue({
      ...baseTableState,
      renderedItems: [renderedItem],
      loading: false,
      resultsCount: <strong>1</strong>,
    });

    renderWithI18n(<Table />);

    expect(screen.queryByTestId('datasetQualityTableNoData')).not.toBeInTheDocument();
  });
});
