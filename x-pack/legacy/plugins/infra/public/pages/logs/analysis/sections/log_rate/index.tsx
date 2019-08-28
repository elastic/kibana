/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { ViewSwitcher } from './view_switcher';
import { ChartView } from './chart';
import { TableView } from './table';

export enum ViewMode {
  chart = 'chart',
  table = 'table',
}

export const LogRateResults = ({
  isLoading,
  results,
}: {
  isLoading: boolean;
  results: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
    defaultMessage: 'Log entry anomalies',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
    { defaultMessage: 'Loading log rate results' }
  );

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.chart);

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
                defaultMessage:
                  'Please allow a few minutes for our machine learning robots to begin collecting data. If you expect data to be here already, you may want to adjust your time range.',
              })}
            </p>
          }
        />
      ) : (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={true}>
              <ViewSwitcher selectedView={viewMode} onChange={id => setViewMode(id as ViewMode)} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          {viewMode === ViewMode.chart ? (
            <ChartView data={results} />
          ) : (
            <TableView data={results} />
          )}
        </>
      )}
    </>
  );
};
