/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { EuiSpacer, OnRefreshProps, EuiSplitPanel } from '@elastic/eui';
import { QualityIssueType } from '../../../state_machines/dataset_quality_details_controller';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { AggregationNotSupported } from './aggregation_not_supported';
import { QualityIssues } from './quality_issues';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';

const OverviewHeader = dynamic(() => import('./header'));
const Summary = dynamic(() => import('./summary'));
const QualitySummaryCards = dynamic(() => import('./quality_summary_cards'));
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

  const [selectedQualityCard, setSelectedQualityCard] =
    React.useState<QualityIssueType>('degraded');

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

      {/* This should be hidden in `streams` view */}
      <Summary />
      <EuiSpacer size="m" />

      <EuiSplitPanel.Outer direction="row" data-test-subj="datasetQualityDetailsOverview">
        <EuiSplitPanel.Inner color="subdued" grow={false}>
          <QualitySummaryCards
            selectedCard={selectedQualityCard}
            setSelectedCard={setSelectedQualityCard}
          />
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={true}>
          <DocumentTrends lastReloadTime={lastReloadTime} />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />
      <QualityIssues />
    </>
  );
}
