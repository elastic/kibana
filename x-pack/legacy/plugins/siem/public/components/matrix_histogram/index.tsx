/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ScaleType } from '@elastic/charts';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSelect, EuiSpacer } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as i18n from './translations';
import { BarChart } from '../charts/barchart';
import { HeaderSection } from '../header_section';
import { MatrixLoader } from './matrix_loader';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData } from './utils';
import { useQuery } from '../../containers/matrix_histogram/utils';
import {
  MatrixHistogramProps,
  MatrixHistogramOption,
  HistogramAggregation,
  MatrixHistogramQueryProps,
} from './types';
import { ChartSeriesData } from '../charts/common';
import { InspectButtonContainer } from '../inspect';

export const MatrixHistogramComponent: React.FC<MatrixHistogramProps &
  MatrixHistogramQueryProps> = ({
  dataKey,
  defaultStackByOption,
  endDate,
  errorMessage,
  filterQuery,
  headerChildren,
  hideHistogramIfEmpty = false,
  id,
  isAlertsHistogram,
  isAnomaliesHistogram,
  isAuthenticationsHistogram,
  isDnsHistogram,
  isEventsHistogram,
  isInspected,
  legendPosition = 'right',
  mapping,
  query,
  scaleType = ScaleType.Time,
  setQuery,
  showLegend = true,
  skip,
  stackByOptions,
  startDate,
  subtitle,
  title,
  updateDateRange,
  yTickFormatter,
}) => {
  const barchartConfigs = getBarchartConfigs({
    from: startDate,
    legendPosition,
    to: endDate,
    onBrushEnd: updateDateRange,
    scaleType,
    yTickFormatter,
    showLegend,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedStackByOption, setSelectedStackByOption] = useState<MatrixHistogramOption>(
    defaultStackByOption
  );

  const [titleWithStackByField, setTitle] = useState<string>('');
  const [subtitleWithCounts, setSubtitle] = useState<string>('');
  const [hideHistogram, setHideHistogram] = useState<boolean>(hideHistogramIfEmpty);
  const [barChartData, setBarChartData] = useState<ChartSeriesData[] | null>(null);
  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
      );
    },
    []
  );

  const { data, loading, inspect, totalCount, refetch = noop } = useQuery<{}, HistogramAggregation>(
    {
      dataKey,
      endDate,
      errorMessage,
      filterQuery,
      query,
      skip,
      startDate,
      title,
      isAlertsHistogram,
      isAnomaliesHistogram,
      isAuthenticationsHistogram,
      isDnsHistogram,
      isEventsHistogram,
      isInspected,
      stackByField: selectedStackByOption.value,
    }
  );

  useEffect(() => {
    if (title != null) setTitle(typeof title === 'function' ? title(selectedStackByOption) : title);

    if (subtitle != null)
      setSubtitle(typeof subtitle === 'function' ? subtitle(totalCount) : subtitle);

    if (totalCount <= 0 && hideHistogramIfEmpty) {
      setHideHistogram(true);
    } else {
      setHideHistogram(false);
    }

    setBarChartData(getCustomChartData(data, mapping));

    setQuery({ id, inspect, loading, refetch });

    if (isInitialLoading && !!barChartData && data) {
      setIsInitialLoading(false);
    }
  }, [
    subtitle,
    setSubtitle,
    setHideHistogram,
    setBarChartData,
    setQuery,
    hideHistogramIfEmpty,
    totalCount,
    isInspected,
    loading,
    data,
    refetch,
    isInitialLoading,
  ]);

  if (hideHistogram) {
    return null;
  }

  return (
    <>
      <InspectButtonContainer show={!isInitialLoading}>
        <Panel data-test-subj={`${id}Panel`}>
          {loading && !isInitialLoading && (
            <EuiProgress
              data-test-subj="initialLoadingPanelMatrixOverTime"
              size="xs"
              position="absolute"
              color="accent"
            />
          )}

          {isInitialLoading ? (
            <>
              <HeaderSection id={id} title={titleWithStackByField} />
              <MatrixLoader />
            </>
          ) : (
            <>
              <HeaderSection
                id={id}
                title={titleWithStackByField}
                subtitle={!loading && (totalCount >= 0 ? subtitleWithCounts : null)}
              >
                <EuiFlexGroup alignItems="center" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    {stackByOptions?.length > 1 && (
                      <EuiSelect
                        onChange={setSelectedChartOptionCallback}
                        options={stackByOptions}
                        prepend={i18n.STACK_BY}
                        value={selectedStackByOption?.value}
                      />
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{headerChildren}</EuiFlexItem>
                </EuiFlexGroup>
              </HeaderSection>
              <BarChart barChart={barChartData} configs={barchartConfigs} />
            </>
          )}
        </Panel>
      </InspectButtonContainer>
      <EuiSpacer size="l" />
    </>
  );
};

export const MatrixHistogram = React.memo(MatrixHistogramComponent);
