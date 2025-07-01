/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EuiIconTip } from '@elastic/eui';
import { DEFAULT_SELECTED_OPTIONS } from '../../../common';
import {
  METRIC_TYPE_VALUES,
  METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP,
  isDefaultMetricType,
} from '../../../common/rest_types';
import { FILTER_NAMES, UX_LABELS } from '../../translations';
import { useDataUsageMetricsUrlParams } from './use_charts_url_params';
import { formatBytes } from '../../utils/format_bytes';
import { ChartsFilterProps } from '../components/filters/charts_filter';

export type FilterName = keyof typeof FILTER_NAMES;

export type FilterItems = Array<{
  key?: string;
  label: string;
  isGroupLabel?: boolean;
  checked?: 'on' | undefined;
  'data-test-subj'?: string;
}>;

export const useChartsFilter = ({
  filterOptions,
}: {
  filterOptions: ChartsFilterProps['filterOptions'];
}): {
  areDataStreamsSelectedOnMount: boolean;
  items: FilterItems;
  setItems: React.Dispatch<React.SetStateAction<FilterItems>>;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  numFilters: number;
  setAreDataStreamsSelectedOnMount: (value: React.SetStateAction<boolean>) => void;
  setUrlDataStreamsFilter: ReturnType<
    typeof useDataUsageMetricsUrlParams
  >['setUrlDataStreamsFilter'];
  setUrlMetricTypesFilter: ReturnType<
    typeof useDataUsageMetricsUrlParams
  >['setUrlMetricTypesFilter'];
} => {
  const {
    dataStreams: selectedDataStreamsFromUrl,
    metricTypes: selectedMetricTypesFromUrl,
    setUrlMetricTypesFilter,
    setUrlDataStreamsFilter,
  } = useDataUsageMetricsUrlParams();
  const isMetricTypesFilter = filterOptions.filterName === 'metricTypes';
  const isDataStreamsFilter = filterOptions.filterName === 'dataStreams';

  // track the state of selected data streams via URL
  //  when the page is loaded via selected data streams on URL
  const [areDataStreamsSelectedOnMount, setAreDataStreamsSelectedOnMount] =
    useState<boolean>(false);

  useEffect(() => {
    if (selectedDataStreamsFromUrl && selectedDataStreamsFromUrl.length > 0) {
      setAreDataStreamsSelectedOnMount(true);
    }
    // don't sync with changes to further selectedDataStreamsFromUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialSelectedOptions = useMemo(() => {
    if (isMetricTypesFilter) {
      return METRIC_TYPE_VALUES.map((metricType) => ({
        key: metricType,
        label: METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP[metricType],
        checked: selectedMetricTypesFromUrl
          ? selectedMetricTypesFromUrl.includes(metricType)
            ? 'on'
            : undefined
          : isDefaultMetricType(metricType) // default metrics are selected by default
          ? 'on'
          : undefined,
        'data-test-subj': `${filterOptions.filterName}-filter-option`,
      })) as FilterItems;
    }
    let dataStreamOptions: FilterItems = [];

    if (isDataStreamsFilter && !!filterOptions.options.length) {
      dataStreamOptions = filterOptions.options?.map((filterOption, i) => ({
        key: filterOption,
        label: filterOption,
        append: formatBytes(filterOptions.appendOptions?.[filterOption] ?? 0),
        checked: selectedDataStreamsFromUrl
          ? selectedDataStreamsFromUrl.includes(filterOption)
            ? 'on'
            : undefined
          : i < DEFAULT_SELECTED_OPTIONS
          ? 'on'
          : undefined,
        'data-test-subj': `${filterOptions.filterName}-filter-option`,
        truncationProps: {
          truncation: 'start',
          truncationOffset: 15,
        },
      }));
    }

    return [
      {
        label: UX_LABELS.filters.dataStreams.label,
        append: (
          <span css={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
            {UX_LABELS.filters.dataStreams.append}
            <EuiIconTip
              content={UX_LABELS.filters.dataStreams.appendTooltip}
              type="info"
              color="subdued"
              css={{ alignContent: 'flex-start', justifyContent: 'flex-start' }}
            />
          </span>
        ),
        isGroupLabel: true,
        'data-test-subj': `${filterOptions.filterName}-group-label`,
      },
      ...dataStreamOptions,
    ];
  }, [
    filterOptions.appendOptions,
    filterOptions.filterName,
    filterOptions.options,
    isDataStreamsFilter,
    isMetricTypesFilter,
    selectedDataStreamsFromUrl,
    selectedMetricTypesFromUrl,
  ]);
  // filter options
  const [items, setItems] = useState<FilterItems>(initialSelectedOptions);

  const hasActiveFilters = useMemo(
    () => !!items.find((item) => !item.isGroupLabel && item.checked === 'on'),
    [items]
  );
  const numActiveFilters = useMemo(
    () => items.filter((item) => !item.isGroupLabel && item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(
    () => items.filter((item) => item.key && item.checked !== 'on').length,
    [items]
  );

  return {
    areDataStreamsSelectedOnMount,
    items,
    setItems,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
    setAreDataStreamsSelectedOnMount,
    setUrlMetricTypesFilter,
    setUrlDataStreamsFilter,
  };
};
