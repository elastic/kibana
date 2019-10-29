/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { LogEntryRateBarChart } from './bar_chart';
import { getLogEntryRatePartitionedSeries } from '../helpers/data_formatters';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

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
  const logEntryRateSeries = useMemo(
    () => (results && results.histogramBuckets ? getLogEntryRatePartitionedSeries(results) : []),
    [results]
  );

  return (
    <>
      <EuiTitle size="m" aria-label={title}>
        <h2>{title}</h2>
      </EuiTitle>
      <LoadingOverlayWrapper isLoading={isLoading} loadingChildren={<LoadingOverlayContent />}>
        {!results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
          <>
            <EuiSpacer size="l" />
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
          </>
        ) : (
          <>
            <EuiText size="s">
              <p>
                <b>
                  {i18n.translate('xpack.infra.logs.analysis.logRateSectionBucketSpanLabel', {
                    defaultMessage: 'Bucket span: ',
                  })}
                </b>
                {i18n.translate('xpack.infra.logs.analysis.logRateSectionBucketSpanValue', {
                  defaultMessage: '15 minutes',
                })}
              </p>
            </EuiText>
            <LogEntryRateBarChart
              setTimeRange={setTimeRange}
              timeRange={timeRange}
              series={logEntryRateSeries}
            />
          </>
        )}
      </LoadingOverlayWrapper>
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
  defaultMessage: 'Log entries',
});

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
  { defaultMessage: 'Loading log rate results' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
