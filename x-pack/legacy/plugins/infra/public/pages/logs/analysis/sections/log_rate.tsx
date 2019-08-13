/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis/results/log_entry_rate';

export const LogRateResults = ({
  isLoading,
  results,
}: {
  isLoading: boolean;
  results: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
    defaultMessage: 'Logs entries',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
    { defaultMessage: 'Loading log rate results' }
  );

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
                defaultMessage: 'Try adjusting your time range',
              })}
            </p>
          }
        />
      ) : (
        <div>results</div>
      )}
    </>
  );
};
