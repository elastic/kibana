/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { ChartView } from './chart';
import { isValidLogRateView, LogRateView, LogRateViewSwitcher } from './log_rate_view_switcher';
import { TableView } from './table';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';

export const LogRateResults = ({
  isLoading,
  results,
  setTimeRange,
  timeRange,
}: {
  isLoading: boolean;
  results: GetLogEntryRateSuccessResponsePayload['data'] | null;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}) => {
  const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
    defaultMessage: 'Log rate',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
    { defaultMessage: 'Loading log rate results' }
  );

  const [viewMode, setViewMode] = useState<LogRateView>('chart');

  return (
    <>
      <EuiTitle size="m" aria-label={title}>
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      {isLoading ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" aria-label={loadingAriaLabel} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : !results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataTitle', {
                defaultMessage: 'There is no data to display.',
              })}
            </h2>
          }
          titleSize="m"
          body={
            <p>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataBody', {
                defaultMessage: 'You may want to adjust your time range.',
              })}
            </p>
          }
        />
      ) : (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={true}>
              <LogRateViewSwitcher
                selectedView={viewMode}
                onChange={id => (isValidLogRateView(id) ? setViewMode(id) : undefined)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          {viewMode === 'chart' ? (
            <ChartView data={results} setTimeRange={setTimeRange} timeRange={timeRange} />
          ) : (
            <TableView data={results} />
          )}
        </>
      )}
    </>
  );
};
