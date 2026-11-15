/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnomalyData } from './use_anomaly_data';

const mockMlApi = {};
const mockJobService = { loadJobsWrapper: jest.fn() };
const mockTimefilter = { getBounds: jest.fn() };
const mockServices = {
  uiSettings: { get: () => 'UTC' },
  data: { query: { timefilter: { timefilter: mockTimefilter } } },
};
const mockGetCombinedJobs = jest.fn();
const mockGetAnomalyData = jest.fn();
const mockLoadAnomaliesTableData = jest.fn();

jest.mock('../../../application/contexts/kibana', () => ({
  useMlApi: () => mockMlApi,
  useMlKibana: () => ({ services: mockServices }),
}));
jest.mock('../../../application/services/job_service', () => ({
  useMlJobService: () => mockJobService,
}));
jest.mock('../../../application/services/anomaly_explorer_charts_service', () => ({
  AnomalyExplorerChartsService: jest.fn().mockImplementation(() => ({
    getCombinedJobs: mockGetCombinedJobs,
    getAnomalyData$: mockGetAnomalyData,
  })),
}));
jest.mock('../../../application/explorer/explorer_utils', () => ({
  createJobs: (jobs: unknown[]) => jobs.map(() => ({ id: 'my-job', selected: true })),
  getDateFormatTz: () => 'UTC',
  loadAnomaliesTableData: (...args: unknown[]) => mockLoadAnomaliesTableData(...args),
}));

const bounds = { min: 1, max: 2 };
const severity = [{ min: 0, max: 3 }, { min: 3 }];
const props = {
  jobId: 'my-job',
  timestamp: 1000000,
  endTimestamp: 3600000,
  chartWidth: 800,
  severity,
};

describe('useAnomalyData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimefilter.getBounds.mockReturnValue(bounds);
    mockGetCombinedJobs.mockResolvedValue([{}]);
    mockGetAnomalyData.mockReturnValue(of({ seriesToPlot: [] }));
    mockLoadAnomaliesTableData.mockResolvedValue({ anomalies: [] });
  });

  it('does not load until the width of the charts is known', () => {
    const { result } = renderHook(() => useAnomalyData({ ...props, chartWidth: 0 }));
    expect(result.current.isLoading).toBe(true);
    expect(mockGetAnomalyData).not.toHaveBeenCalled();
    expect(mockLoadAnomaliesTableData).not.toHaveBeenCalled();
  });

  it('loads the charts and table as the explorer does for a cell of the overall swim lane', async () => {
    const { result } = renderHook(() => useAnomalyData(props));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.chartsData).toEqual({ seriesToPlot: [] });
    expect(result.current.tableData).toEqual({ anomalies: [] });
    expect(result.current.jobs).toEqual([{ id: 'my-job', selected: true }]);

    expect(mockGetAnomalyData).toHaveBeenCalledWith(
      ['my-job'],
      800,
      1000000,
      3600000,
      severity,
      undefined,
      [],
      6
    );
    expect(mockLoadAnomaliesTableData).toHaveBeenCalledWith(
      mockMlApi,
      mockJobService,
      { type: 'overall', lanes: expect.any(Array), times: [1000, 3600] },
      [{ id: 'my-job', selected: true }],
      'UTC',
      bounds,
      expect.any(String),
      'second',
      { val: severity }
    );
  });

  it('gives the error when the data could not be loaded', async () => {
    mockLoadAnomaliesTableData.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAnomalyData(props));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.tableData).toBeUndefined();
  });
});
