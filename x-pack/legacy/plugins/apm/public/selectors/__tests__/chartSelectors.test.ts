/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmTimeSeriesResponse } from '../../../server/lib/transactions/charts/get_timeseries_data/transform';
import {
  getAnomalyScoreSeries,
  getResponseTimeSeries,
  getTpmSeries
} from '../chartSelectors';

describe('chartSelectors', () => {
  describe('getAnomalyScoreSeries', () => {
    it('should return anomalyScoreSeries', () => {
      const data = [{ x0: 0, x: 10 }];
      expect(getAnomalyScoreSeries(data)).toEqual({
        areaColor: 'rgba(146,0,0,0.1)',
        color: 'none',
        data: [{ x0: 0, x: 10 }],
        hideLegend: true,
        hideTooltipValue: true,
        title: 'Anomaly score',
        type: 'areaMaxHeight'
      });
    });
  });

  describe('getResponseTimeSeries', () => {
    const apmTimeseries = {
      responseTimes: {
        avg: [{ x: 0, y: 100 }, { x: 1000, y: 200 }],
        p95: [{ x: 0, y: 200 }, { x: 1000, y: 300 }],
        p99: [{ x: 0, y: 300 }, { x: 1000, y: 400 }]
      },
      overallAvgDuration: 200
    } as ApmTimeSeriesResponse;

    it('should produce correct series', () => {
      expect(
        getResponseTimeSeries({ apmTimeseries, anomalyTimeseries: undefined })
      ).toEqual([
        {
          color: '#3185fc',
          data: [{ x: 0, y: 100 }, { x: 1000, y: 200 }],
          legendValue: '0 ms',
          title: 'Avg.',
          type: 'linemark'
        },
        {
          color: '#e6c220',
          data: [{ x: 0, y: 200 }, { x: 1000, y: 300 }],
          title: '95th percentile',
          titleShort: '95th',
          type: 'linemark'
        },
        {
          color: '#f98510',
          data: [{ x: 0, y: 300 }, { x: 1000, y: 400 }],
          title: '99th percentile',
          titleShort: '99th',
          type: 'linemark'
        }
      ]);
    });

    it('should return 3 series', () => {
      expect(
        getResponseTimeSeries({ apmTimeseries, anomalyTimeseries: undefined })
          .length
      ).toBe(3);
    });
  });

  describe('getTpmSeries', () => {
    const apmTimeseries = ({
      tpmBuckets: [
        { key: 'HTTP 2xx', dataPoints: [{ x: 0, y: 5 }, { x: 0, y: 2 }] },
        { key: 'HTTP 4xx', dataPoints: [{ x: 0, y: 1 }] },
        { key: 'HTTP 5xx', dataPoints: [{ x: 0, y: 0 }] }
      ]
    } as any) as ApmTimeSeriesResponse;
    const transactionType = 'MyTransactionType';
    it('should produce correct series', () => {
      expect(getTpmSeries(apmTimeseries, transactionType)).toEqual([
        {
          color: '#00b3a4',
          data: [{ x: 0, y: 5 }, { x: 0, y: 2 }],
          legendValue: '3.5 tpm',
          title: 'HTTP 2xx',
          type: 'linemark'
        },
        {
          color: '#f98510',
          data: [{ x: 0, y: 1 }],
          legendValue: '1.0 tpm',
          title: 'HTTP 4xx',
          type: 'linemark'
        },
        {
          color: '#db1374',
          data: [{ x: 0, y: 0 }],
          legendValue: '0.0 tpm',
          title: 'HTTP 5xx',
          type: 'linemark'
        }
      ]);
    });
  });
});
