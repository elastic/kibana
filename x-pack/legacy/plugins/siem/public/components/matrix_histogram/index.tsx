/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Position } from '@elastic/charts';
import styled from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSelect, EuiSpacer } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { compose } from 'redux';
import { connect } from 'react-redux';
import * as i18n from './translations';
import { BarChart } from '../charts/barchart';
import { HeaderSection } from '../header_section';
import { MatrixLoader } from './matrix_loader';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData } from '../../components/matrix_histogram/utils';
import { useQuery } from '../../containers/matrix_histogram';
import {
  MatrixHistogramProps,
  MatrixHistogramOption,
  HistogramAggregation,
  MatrixHistogramQueryProps,
} from './types';
import { ChartSeriesData } from '../charts/common';
import { InspectButtonContainer } from '../inspect';

import { State, inputsSelectors, hostsModel, networkModel } from '../../store';

import {
  MatrixHistogramMappingTypes,
  GetTitle,
  GetSubTitle,
} from '../../components/matrix_histogram/types';
import { SetQuery } from '../../pages/hosts/navigation/types';
import { QueryTemplateProps } from '../../containers/query_template';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { HistogramType } from '../../graphql/types';

export interface OwnProps extends QueryTemplateProps {
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  histogramType: HistogramType;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  setQuery: SetQuery;
  showLegend?: boolean;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
  type: hostsModel.HostsType | networkModel.NetworkType;
}

const DEFAULT_PANEL_HEIGHT = 300;

const HeaderChildrenFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

const HistogramPanel = styled(Panel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
`;

export const MatrixHistogramComponent: React.FC<MatrixHistogramProps &
  MatrixHistogramQueryProps> = ({
  chartHeight,
  defaultStackByOption,
  endDate,
  errorMessage,
  filterQuery,
  headerChildren,
  histogramType,
  hideHistogramIfEmpty = false,
  id,
  isInspected,
  legendPosition,
  mapping,
  panelHeight = DEFAULT_PANEL_HEIGHT,
  setQuery,
  showLegend,
  stackByOptions,
  startDate,
  subtitle,
  title,
  dispatchSetAbsoluteRangeDatePicker,
  yTickFormatter,
}) => {
  const barchartConfigs = useMemo(
    () =>
      getBarchartConfigs({
        chartHeight,
        from: startDate,
        legendPosition,
        to: endDate,
        onBrushEnd: (min: number, max: number) => {
          dispatchSetAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
        },
        yTickFormatter,
        showLegend,
      }),
    [
      chartHeight,
      startDate,
      legendPosition,
      endDate,
      dispatchSetAbsoluteRangeDatePicker,
      yTickFormatter,
      showLegend,
    ]
  );
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
      endDate,
      errorMessage,
      filterQuery,
      histogramType,
      startDate,
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
    id,
    inspect,
    isInspected,
    loading,
    refetch,
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
        <HistogramPanel data-test-subj={`${id}Panel`} height={panelHeight}>
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
              <HeaderSection
                id={id}
                title={titleWithStackByField}
                subtitle={!isInitialLoading && (totalCount >= 0 ? subtitleWithCounts : null)}
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
                  <HeaderChildrenFlexItem grow={false}>{headerChildren}</HeaderChildrenFlexItem>
                </EuiFlexGroup>
              </HeaderSection>
              <MatrixLoader />
            </>
          ) : (
            <>
              <HeaderSection
                id={id}
                title={titleWithStackByField}
                subtitle={
                  !isInitialLoading &&
                  (totalCount != null && totalCount >= 0 ? subtitleWithCounts : null)
                }
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
                  <HeaderChildrenFlexItem grow={false}>{headerChildren}</HeaderChildrenFlexItem>
                </EuiFlexGroup>
              </HeaderSection>
              <BarChart barChart={barChartData} configs={barchartConfigs} />
            </>
          )}
        </HistogramPanel>
      </InspectButtonContainer>
      <EuiSpacer size="l" />
    </>
  );
};

export const MatrixHistogram = React.memo(MatrixHistogramComponent);

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const MatrixHistogramContainer = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps, {
    dispatchSetAbsoluteRangeDatePicker: setAbsoluteRangeDatePicker,
  })
)(MatrixHistogram);
