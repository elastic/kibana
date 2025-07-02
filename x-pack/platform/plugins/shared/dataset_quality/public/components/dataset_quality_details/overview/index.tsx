/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { EuiCallOut, EuiFlexItem, EuiLink, EuiSpacer, OnRefreshProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { AggregationNotSupported } from './aggregation_not_supported';
import { QualityIssues } from './quality_issues';
import { FailureStoreWarning } from '../../failure_store/failure_store_warning';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';

const OverviewHeader = dynamic(() => import('./header'));
const Summary = dynamic(() => import('./summary'));
const DocumentTrends = dynamic(() => import('./document_trends'));

export function Overview() {
  const {
    dataStream,
    isNonAggregatable,
    canUserReadFailureStore,
    hasFailureStore,
    updateTimeRange,
    loadingState: { dataStreamSettingsLoading },
  } = useDatasetQualityDetailsState();

  const {
    services: {
      share: { url: urlService },
    },
  } = useKibanaContextForPlugin();

  const locator = urlService.locators.get('INDEX_MANAGEMENT_LOCATOR_ID');
  const locatorParams = { page: 'data_streams_details', dataStreamName: dataStream } as const;

  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const handleRefresh = useCallback(
    (refreshProps: OnRefreshProps) => {
      updateTimeRange(refreshProps);
      setLastReloadTime(Date.now());
    },
    [updateTimeRange]
  );
  return (
    <>
      {isNonAggregatable && <AggregationNotSupported dataStream={dataStream} />}
      <OverviewHeader handleRefresh={handleRefresh} />
      <EuiSpacer size="m" />
      {!dataStreamSettingsLoading && !hasFailureStore && canUserReadFailureStore && (
        <div style={{ marginBottom: 16 }}>
          <EuiCallOut
            color="warning"
            title={
              <>
                {i18n.translate('xpack.datasetQuality.noFailureStoreTitle', {
                  defaultMessage: 'Failure store is not enabled for this data stream. ',
                })}
                <EuiLink
                  href={locator?.getRedirectUrl(locatorParams)}
                  target="_blank"
                  external={false}
                  css={{ textDecoration: 'underline' }}
                >
                  {i18n.translate('xpack.datasetQuality.enableFailureStore', {
                    defaultMessage: 'Enable failure store',
                  })}
                </EuiLink>
              </>
            }
          />
        </div>
      )}

      {!dataStreamSettingsLoading && !canUserReadFailureStore && (
        <EuiFlexItem>
          <FailureStoreWarning />
          <EuiSpacer size="m" />
        </EuiFlexItem>
      )}
      <Summary />
      <EuiSpacer size="m" />
      <DocumentTrends lastReloadTime={lastReloadTime} />
      <EuiSpacer size="m" />
      <QualityIssues />
    </>
  );
}
