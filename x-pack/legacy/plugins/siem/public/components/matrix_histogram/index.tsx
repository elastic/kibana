/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScaleType } from '@elastic/charts';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiLoadingContent, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApolloConsumer } from 'react-apollo';
import { BarChart } from '../charts/barchart';
import { HeaderSection } from '../header_section';
import { ChartSeriesData } from '../charts/common';
import { DEFAULT_DARK_MODE } from '../../../common/constants';
import { useUiSetting$ } from '../../lib/kibana';
import { Loader } from '../loader';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData, useQuery } from './utils';
import {
  MatrixHistogramProps,
  MatrixHistogramOption,
  HistogramAggregation,
  MatrixHistogramQueryProps,
  MatrixHistogramDataTypes,
} from './types';
import { generateTablePaginationOptions } from '../paginated_table/helpers';

export const MatrixHistogram = React.memo(
  ({
    activePage,
    dataKey,
    defaultStackByOption,
    endDate,
    filterQuery,
    hideHistogramIfEmpty = false,
    id,
    isPtrIncluded,
    isInspected,
    limit,
    mapping,
    query,
    scaleType = ScaleType.Time,
    showLegend,
    stackByOptions,
    startDate,
    subtitle,
    title,
    updateDateRange,
    yTickFormatter,
    sort,
  }: MatrixHistogramProps & MatrixHistogramQueryProps) => {
    const barchartConfigs = getBarchartConfigs({
      from: startDate,
      to: endDate,
      onBrushEnd: updateDateRange,
      scaleType,
      yTickFormatter,
      showLegend,
    });
    const [showInspect, setShowInspect] = useState(false);
    const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);

    const handleOnMouseEnter = useCallback(() => setShowInspect(true), []);
    const handleOnMouseLeave = useCallback(() => setShowInspect(false), []);

    const [selectedStackByOption, setSelectedStackByOption] = useState<MatrixHistogramOption>(
      defaultStackByOption
    );
    const [subtitleWithCounts, setSubtitle] = useState(subtitle);
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<MatrixHistogramDataTypes[] | null>(null);
    const [hideHistogram, setHideHistogram] = useState<boolean>(hideHistogramIfEmpty);
    const [totalCount, setTotalCount] = useState(-1);
    const setSelectedChatOptionCallback = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStackByOption(
          stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
        );
      },
      []
    );

    return (
      <ApolloConsumer>
        {client => {
          useQuery<{}, HistogramAggregation>({
            dataKey,
            endDate,
            query,
            setLoading,
            setData,
            setTotalCount,
            startDate,
            sort,
            isInspected,
            isPtrIncluded,
            isHistogram: true,
            pagination:
              activePage != null && limit != null
                ? generateTablePaginationOptions(activePage, limit)
                : undefined,
          });
          useEffect(() => {
            const formattedSubTitle = subtitle?.replace('{{totalCount}}', totalCount.toString());
            setSubtitle(formattedSubTitle);

            if (totalCount <= 0) {
              if (hideHistogramIfEmpty) setHideHistogram(true);
              else setHideHistogram(false);
            } else {
              setHideHistogram(false);
            }
          }, [totalCount]);

          const barChartData: ChartSeriesData[] = useMemo(() => getCustomChartData(data, mapping), [
            data,
          ]);
          return !hideHistogram ? (
            <Panel
              data-test-subj={`${id}Panel`}
              loading={loading}
              onMouseEnter={handleOnMouseEnter}
              onMouseLeave={handleOnMouseLeave}
            >
              <HeaderSection
                id={id}
                title={
                  title && selectedStackByOption
                    ? `${title} by ${selectedStackByOption.text}`
                    : null
                }
                showInspect={!loading && showInspect}
                subtitle={!loading && (totalCount >= 0 ? subtitleWithCounts : null)}
              >
                {stackByOptions && (
                  <EuiSelect
                    onChange={setSelectedChatOptionCallback}
                    options={stackByOptions}
                    prepend={i18n.translate(
                      'xpack.siem.detectionEngine.signals.histogram.stackByOptions.stackByLabel',
                      {
                        defaultMessage: 'Stack by',
                      }
                    )}
                    value={selectedStackByOption?.value}
                  />
                )}
              </HeaderSection>

              {loading ? (
                <EuiLoadingContent data-test-subj="initialLoadingPanelMatrixOverTime" lines={10} />
              ) : (
                <>
                  <BarChart barChart={barChartData} configs={barchartConfigs} />

                  {loading && (
                    <Loader
                      overlay
                      overlayBackground={
                        darkMode
                          ? darkTheme.euiPageBackgroundColor
                          : lightTheme.euiPageBackgroundColor
                      }
                      size="xl"
                    />
                  )}
                </>
              )}
            </Panel>
          ) : null;
        }}
      </ApolloConsumer>
    );
  }
);
