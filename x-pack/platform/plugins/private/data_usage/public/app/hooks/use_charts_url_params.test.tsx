/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE_VALUES, type MetricTypes } from '../../../common/rest_types';
import { getDataUsageMetricsFiltersFromUrlParams } from './use_charts_url_params';

describe('#getDataUsageMetricsFiltersFromUrlParams', () => {
  const getMetricTypesAsArray = (): MetricTypes[] => {
    return [...METRIC_TYPE_VALUES];
  };

  it('should not use invalid `metricTypes` values from URL params', () => {
    expect(getDataUsageMetricsFiltersFromUrlParams({ metricTypes: 'bar,foo' })).toEqual({});
  });

  it('should use valid `metricTypes` values from URL params', () => {
    expect(
      getDataUsageMetricsFiltersFromUrlParams({
        metricTypes: `${getMetricTypesAsArray().join()},foo,bar`,
      })
    ).toEqual({
      metricTypes: getMetricTypesAsArray().sort(),
    });
  });

  it('should use given `dataStreams` values from URL params', () => {
    expect(
      getDataUsageMetricsFiltersFromUrlParams({
        dataStreams: 'ds-3,ds-1,ds-2',
      })
    ).toEqual({
      dataStreams: ['ds-3', 'ds-1', 'ds-2'],
    });
  });

  it('should use valid `metricTypes` along with given `dataStreams` and date values from URL params', () => {
    expect(
      getDataUsageMetricsFiltersFromUrlParams({
        metricTypes: getMetricTypesAsArray().join(),
        dataStreams: 'ds-5,ds-1,ds-2',
        startDate: '2022-09-12T08:00:00.000Z',
        endDate: '2022-09-12T08:30:33.140Z',
      })
    ).toEqual({
      metricTypes: getMetricTypesAsArray().sort(),
      endDate: '2022-09-12T08:30:33.140Z',
      dataStreams: ['ds-5', 'ds-1', 'ds-2'],
      startDate: '2022-09-12T08:00:00.000Z',
    });
  });

  it('should use given relative startDate and endDate values URL params', () => {
    expect(
      getDataUsageMetricsFiltersFromUrlParams({
        startDate: 'now-9d',
        endDate: 'now-24h/h',
      })
    ).toEqual({
      endDate: 'now-24h/h',
      startDate: 'now-9d',
    });
  });

  it('should use given absolute startDate and endDate values URL params', () => {
    expect(
      getDataUsageMetricsFiltersFromUrlParams({
        startDate: '2022-09-12T08:00:00.000Z',
        endDate: '2022-09-12T08:30:33.140Z',
      })
    ).toEqual({
      endDate: '2022-09-12T08:30:33.140Z',
      startDate: '2022-09-12T08:00:00.000Z',
    });
  });
});
