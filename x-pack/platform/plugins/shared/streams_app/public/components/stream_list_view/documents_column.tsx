/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiI18nNumber, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import type { useTimefilter } from '../../hooks/use_timefilter';
import { TooltipOrPopoverIcon } from '../tooltip_popover_icon/tooltip_popover_icon';
import { getFormattedError } from '../../util/errors';

export function DocumentsColumn({
  indexPattern,
  histogramQueryFetch,
}: {
  indexPattern: string;
  histogramQueryFetch: Promise<UnparsedEsqlResponse>;
  timeState?: ReturnType<typeof useTimefilter>['timeState'];
  numDataPoints?: number;
}) {
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
  const noDocCountData = histogramQueryResult.error ? '' : '-';

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
      gutterSize="none"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
      role="group"
      aria-label={cellAriaLabel}
    >
      {histogramQueryResult.loading ? (
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      ) : histogramQueryResult.error ? (
        <EuiFlexItem grow={false}>
          <TooltipOrPopoverIcon
            dataTestSubj="streamsDocCount-error"
            icon="warning"
            title={getFormattedError(histogramQueryResult.error).message}
            mode="popover"
            iconColor="danger"
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem
          grow={false}
          className={css`
            text-align: right;
            font-family: 'Roboto mono', sans-serif;
          `}
          data-test-subj={`streamsDocCount-${indexPattern}`}
        >
          {hasData ? <EuiI18nNumber value={docCount} /> : noDocCountData}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
