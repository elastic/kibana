/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18nNumber,
  EuiLoadingChart,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import {
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  niceTimeFormatter,
  Tooltip,
  TooltipStickTo,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import type { useTimefilter } from '../../hooks/use_timefilter';
import { TooltipOrPopoverIcon } from '../tooltip_popover_icon/tooltip_popover_icon';
import { getFormattedError } from '../../util/errors';
import {
  DOCUMENTS_CELL_CHART_WIDTH_PX,
  DOCUMENTS_CELL_COUNT_SLOT_REM,
} from './documents_cell_layout';

export function DocumentsColumn({
  indexPattern,
  histogramQueryFetch,
  timeState,
  numDataPoints,
}: {
  indexPattern: string;
  histogramQueryFetch: Promise<UnparsedEsqlResponse>;
  timeState: ReturnType<typeof useTimefilter>['timeState'];
  numDataPoints: number;
}) {
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const histogramQueryResult = useAsync(() => histogramQueryFetch, [histogramQueryFetch]);

  const allTimeseries = React.useMemo(
    () =>
      esqlResultToTimeseries({
        result: histogramQueryResult,
        metricNames: ['doc_count'],
      }),
    [histogramQueryResult]
  );

  const docCount = React.useMemo(
    () =>
      allTimeseries.reduce(
        (acc, series) => acc + series.data.reduce((acc2, item) => acc2 + (item.doc_count || 0), 0),
        0
      ),
    [allTimeseries]
  );

  const hasData = docCount > 0;

  const xFormatter = niceTimeFormatter([timeState.start, timeState.end]);
  const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

  const noDocCountData = histogramQueryResult.error ? '' : '-';

  const noHistogramData = histogramQueryResult.error ? (
    <TooltipOrPopoverIcon
      dataTestSubj="streamsDocCount-error"
      icon="warning"
      title={getFormattedError(histogramQueryResult.error).message}
      mode="popover"
      iconColor="danger"
    />
  ) : (
    <EuiIcon type="visLine" size="m" />
  );

  const cellAriaLabel = hasData
    ? i18n.translate('xpack.streams.documentsColumn.cellDocCountLabel', {
        defaultMessage: '{docCount} documents in {indexPattern}',
        values: { docCount, indexPattern },
      })
    : i18n.translate('xpack.streams.documentsColumn.cellNoDataLabel', {
        defaultMessage: 'No documents found in {indexPattern}',
        values: { indexPattern },
      });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      justifyContent="flexEnd"
      wrap={false}
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
        width: 100%;
      `}
      role="group"
      aria-label={cellAriaLabel}
    >
      {histogramQueryResult.loading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <EuiFlexItem
            grow={false}
            aria-hidden="true"
            className={css`
              flex: 0 0 ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
              max-width: ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              text-align: right;
              font-variant-numeric: tabular-nums;
              font-family: ${euiTheme.font.familyCode};
            `}
            data-test-subj={`streamsDocCount-${indexPattern}`}
          >
            {hasData ? <EuiI18nNumber value={docCount} /> : noDocCountData}
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            aria-hidden="true"
            className={css`
              flex: 0 0 ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
              width: ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
              border-bottom: ${hasData ? '1px solid' : 'none'} ${euiTheme.colors.lightShade};
              display: flex;
              justify-content: flex-end;
              align-items: center;
            `}
          >
            {hasData ? (
              <Chart size={{ width: DOCUMENTS_CELL_CHART_WIDTH_PX, height: euiTheme.size.l }}>
                <Settings
                  locale={i18n.getLocale()}
                  baseTheme={chartBaseTheme}
                  theme={{ background: { color: 'transparent' } }}
                  xDomain={{ min: timeState.start, max: timeState.end, minInterval }}
                  noResults={<div />}
                />
                <Tooltip
                  stickTo={TooltipStickTo.Middle}
                  headerFormatter={({ value }) => xFormatter(value)}
                />
                {allTimeseries.map((serie) => (
                  <BarSeries
                    key={serie.id}
                    id={serie.id}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['doc_count']}
                    data={serie.data}
                  />
                ))}
              </Chart>
            ) : (
              noHistogramData
            )}
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}

const LoadingPlaceholder = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexEnd"
      gutterSize="s"
      responsive={false}
      wrap={false}
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
        width: 100%;
      `}
    >
      <EuiFlexItem
        grow={false}
        className={css`
          flex: 0 0 ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
          max-width: ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-family: ${euiTheme.font.familyCode};
        `}
      >
        -
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        className={css`
          flex: 0 0 ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
          width: ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        `}
      >
        <EuiLoadingChart size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
