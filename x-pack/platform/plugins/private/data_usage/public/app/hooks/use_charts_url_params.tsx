/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { type MetricTypes, isMetricType } from '../../../common/rest_types';
import { useUrlParams } from '../../hooks/use_url_params';
import { DEFAULT_DATE_RANGE_OPTIONS } from '../../../common/utils';

interface UrlParamsDataUsageMetricsFilters {
  metricTypes: string;
  dataStreams: string;
  startDate: string;
  endDate: string;
}

interface DataUsageMetricsFiltersFromUrlParams {
  metricTypes?: MetricTypes[];
  dataStreams?: string[];
  startDate?: string;
  endDate?: string;
  setUrlDataStreamsFilter: (dataStreams: UrlParamsDataUsageMetricsFilters['dataStreams']) => void;
  setUrlDateRangeFilter: ({ startDate, endDate }: { startDate: string; endDate: string }) => void;
  setUrlMetricTypesFilter: (metricTypes: UrlParamsDataUsageMetricsFilters['metricTypes']) => void;
}

type FiltersFromUrl = Pick<
  DataUsageMetricsFiltersFromUrlParams,
  'metricTypes' | 'dataStreams' | 'startDate' | 'endDate'
>;

export const getDataUsageMetricsFiltersFromUrlParams = (
  urlParams: Partial<UrlParamsDataUsageMetricsFilters>
): FiltersFromUrl => {
  const dataUsageMetricsFilters: FiltersFromUrl = {
    metricTypes: [],
    dataStreams: [],
    startDate: DEFAULT_DATE_RANGE_OPTIONS.startDate,
    endDate: DEFAULT_DATE_RANGE_OPTIONS.endDate,
  };

  const urlMetricTypes = urlParams.metricTypes
    ? String(urlParams.metricTypes)
        .split(',')
        .reduce<MetricTypes[]>((acc, curr) => {
          if (isMetricType(curr)) {
            acc.push(curr);
          }
          return acc.sort();
        }, [])
    : [];

  const urlDataStreams = urlParams.dataStreams ? String(urlParams.dataStreams).split(',') : [];

  dataUsageMetricsFilters.metricTypes = urlMetricTypes.length ? urlMetricTypes : undefined;
  dataUsageMetricsFilters.dataStreams = urlDataStreams.length ? urlDataStreams : undefined;
  dataUsageMetricsFilters.startDate = urlParams.startDate ? String(urlParams.startDate) : undefined;
  dataUsageMetricsFilters.endDate = urlParams.endDate ? String(urlParams.endDate) : undefined;

  return dataUsageMetricsFilters;
};

export const useDataUsageMetricsUrlParams = (): DataUsageMetricsFiltersFromUrlParams => {
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();

  const getUrlDataUsageMetricsFilters: FiltersFromUrl = useMemo(
    () => getDataUsageMetricsFiltersFromUrlParams(urlParams),
    [urlParams]
  );
  const [dataUsageMetricsFilters, setDataUsageMetricsFilters] = useState(
    getUrlDataUsageMetricsFilters
  );

  const setUrlMetricTypesFilter = useCallback(
    (metricTypes: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          metricTypes: metricTypes.length ? metricTypes : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlDataStreamsFilter = useCallback(
    (dataStreams: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          dataStreams: dataStreams.length ? dataStreams : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlDateRangeFilter = useCallback(
    ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          startDate: startDate.length ? startDate : undefined,
          endDate: endDate.length ? endDate : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  useEffect(() => {
    setDataUsageMetricsFilters((prevState) => {
      return {
        ...prevState,
        ...getDataUsageMetricsFiltersFromUrlParams(urlParams),
      };
    });
  }, [setDataUsageMetricsFilters, urlParams]);

  return {
    ...dataUsageMetricsFilters,
    setUrlDataStreamsFilter,
    setUrlDateRangeFilter,
    setUrlMetricTypesFilter,
  };
};
