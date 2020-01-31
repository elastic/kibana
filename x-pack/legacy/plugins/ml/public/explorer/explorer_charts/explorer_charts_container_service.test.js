/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './explorer_charts_container_service.test.mocks';
import _ from 'lodash';

import mockAnomalyChartRecords from './__mocks__/mock_anomaly_chart_records.json';
import mockDetectorsByJob from './__mocks__/mock_detectors_by_job.json';
import mockJobConfig from './__mocks__/mock_job_config.json';
import mockSeriesPromisesResponse from './__mocks__/mock_series_promises_response.json';

// Some notes on the tests and mocks:
//
// 'call anomalyChangeListener with actual series config'
// This test uses the standard mocks and uses the data as is provided via the mock files.
// The mocked services check for values in the data (e.g. 'mock-job-id', 'farequore-2017')
// and return the mock data from the files.
//
// 'filtering should skip values of null'
// This is is used to verify that values of `null` get filtered out but `0` is kept.
// The test clones mock data from files and adjusts job_id and indices to trigger
// suitable responses from the mocked services. The mocked services check against the
// provided alternative values and return specific modified mock responses for the test case.

const mockJobConfigClone = _.cloneDeep(mockJobConfig);

// adjust mock data to tests against null/0 values
const mockMetricClone = _.cloneDeep(mockSeriesPromisesResponse[0][0]);
mockMetricClone.results['1486712700000'] = null;
mockMetricClone.results['1486713600000'] = 0;

jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob(jobId) {
      // this is for 'call anomalyChangeListener with actual series config'
      if (jobId === 'mock-job-id') {
        return mockJobConfig;
      }
      // this is for 'filtering should skip values of null'
      mockJobConfigClone.datafeed_config.indices = [`farequote-2017-${jobId}`];
      return mockJobConfigClone;
    },
    detectorsByJob: mockDetectorsByJob,
  },
}));

jest.mock('../../services/results_service', () => ({
  mlResultsService: {
    getMetricData(indices) {
      // this is for 'call anomalyChangeListener with actual series config'
      if (indices[0] === 'farequote-2017') {
        return Promise.resolve(mockSeriesPromisesResponse[0][0]);
      }
      // this is for 'filtering should skip values of null'
      return Promise.resolve(mockMetricClone);
    },
    getRecordsForCriteria() {
      return Promise.resolve(mockSeriesPromisesResponse[0][1]);
    },
    getScheduledEventsByBucket() {
      return Promise.resolve(mockSeriesPromisesResponse[0][2]);
    },
    getEventDistributionData(indices) {
      // this is for 'call anomalyChangeListener with actual series config'
      if (indices[0] === 'farequote-2017') {
        return Promise.resolve([]);
      }
      // this is for 'filtering should skip values of null' and
      // resolves with a dummy object to trigger the processing
      // of the event distribution chartdata filtering
      return Promise.resolve([
        {
          entity: 'mock',
        },
      ]);
    },
  },
}));

jest.mock('../../util/string_utils', () => ({
  mlEscape(d) {
    return d;
  },
}));

jest.mock('../legacy_utils', () => ({
  getChartContainerWidth() {
    return 1140;
  },
}));

jest.mock('ui/chrome', () => ({
  getBasePath: path => path,
  getUiSettingsClient: () => ({
    get: () => null,
  }),
}));

import {
  explorerChartsContainerServiceFactory,
  getDefaultChartsData,
} from './explorer_charts_container_service';

describe('explorerChartsContainerService', () => {
  test('Initialize factory', done => {
    explorerChartsContainerServiceFactory(callback);

    function callback(data) {
      expect(data).toEqual(getDefaultChartsData());
      done();
    }
  });

  test('call anomalyChangeListener with empty series config', done => {
    // callback will be called multiple times.
    // the callbackData array contains the expected data values for each consecutive call.
    const callbackData = [];
    callbackData.push(getDefaultChartsData());
    callbackData.push({
      ...getDefaultChartsData(),
      chartsPerRow: 2,
    });

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(callback);

    anomalyDataChangeListener([], 1486656000000, 1486670399999);

    function callback(data) {
      if (callbackData.length > 0) {
        expect(data).toEqual({
          ...callbackData.shift(),
        });
      }
      if (callbackData.length === 0) {
        done();
      }
    }
  });

  test('call anomalyChangeListener with actual series config', done => {
    let callbackCount = 0;
    const expectedTestCount = 3;

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(callback);

    anomalyDataChangeListener(mockAnomalyChartRecords, 1486656000000, 1486670399999);

    function callback(data) {
      callbackCount++;
      expect(data).toMatchSnapshot();
      if (callbackCount === expectedTestCount) {
        done();
      }
    }
  });

  test('filtering should skip values of null', done => {
    let callbackCount = 0;
    const expectedTestCount = 3;

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(callback);

    const mockAnomalyChartRecordsClone = _.cloneDeep(mockAnomalyChartRecords).map(d => {
      d.job_id = 'mock-job-id-distribution';
      return d;
    });

    anomalyDataChangeListener(mockAnomalyChartRecordsClone, 1486656000000, 1486670399999);

    function callback(data) {
      callbackCount++;

      if (callbackCount === 1) {
        expect(data.seriesToPlot).toHaveLength(0);
      }
      if (callbackCount === 3) {
        expect(data.seriesToPlot).toHaveLength(1);

        // the mock source dataset has a length of 115. one data point has a value of `null`,
        // and another one `0`. the received dataset should have a length of 114,
        // it should remove the datapoint with `null` and keep the one with `0`.
        const chartData = data.seriesToPlot[0].chartData;
        expect(chartData).toHaveLength(114);
        expect(chartData.filter(d => d.value === 0)).toHaveLength(1);
        expect(chartData.filter(d => d.value === null)).toHaveLength(0);
      }
      if (callbackCount === expectedTestCount) {
        done();
      }
    }
  });

  test('field value with trailing dot should not throw an error', done => {
    let callbackCount = 0;
    const expectedTestCount = 3;

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(callback);

    const mockAnomalyChartRecordsClone = _.cloneDeep(mockAnomalyChartRecords);
    mockAnomalyChartRecordsClone[1].partition_field_value = 'AAL.';

    expect(() => {
      anomalyDataChangeListener(mockAnomalyChartRecordsClone, 1486656000000, 1486670399999);
    }).not.toThrow();

    function callback() {
      callbackCount++;

      if (callbackCount === expectedTestCount) {
        done();
      }
    }
  });
});
