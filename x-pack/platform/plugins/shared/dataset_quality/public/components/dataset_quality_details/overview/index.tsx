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
import { noAccessToFailureStoreWarningDescription } from '../../../../common/translations';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { AggregationNotSupported } from './aggregation_not_supported';
import { QualityIssues } from './quality_issues';

const FAILURE_STORE_DOCS_URL =
  'https://www.elastic.co/docs/manage-data/data-store/data-streams/failure-store';

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
      {!hasFailureStore && canUserReadFailureStore && (
        <div style={{ marginBottom: 16 }}>
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.datasetQuality.noFailureStoreTitle', {
              defaultMessage: 'Failure store is not enabled for this data stream.',
            })}
          >
            <EuiLink href={FAILURE_STORE_DOCS_URL} external>
              {i18n.translate('xpack.datasetQuality.learnMore', {
                defaultMessage: 'Learn how to enable it',
              })}
            </EuiLink>
          </EuiCallOut>
        </div>
      )}
      {!dataStreamSettingsLoading && !canUserReadFailureStore && (
        <EuiFlexItem>
          <EuiCallOut
            title={noAccessToFailureStoreWarningDescription}
            color="warning"
            iconType="warning"
          />
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
