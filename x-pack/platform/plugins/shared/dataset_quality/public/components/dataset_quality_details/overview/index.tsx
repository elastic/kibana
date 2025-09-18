/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { OnRefreshProps } from '@elastic/eui';
import { EuiFlexItem, EuiSpacer, EuiSplitPanel } from '@elastic/eui';
import type { QualityIssueType } from '../../../state_machines/dataset_quality_details_controller';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { AggregationNotSupported } from './aggregation_not_supported';
import { QualityIssues } from './quality_issues';
import { FailureStoreWarning } from '../../failure_store/failure_store_warning';

const OverviewHeader = dynamic(() => import('./header'));
const Summary = dynamic(() => import('./summary'));
const QualitySummaryCards = dynamic(() => import('./quality_summary_cards'));
const DocumentTrends = dynamic(() => import('./document_trends'));

export function Overview({ openAlertFlyout }: { openAlertFlyout: () => void }) {
  const {
    dataStream,
    isNonAggregatable,
    canUserReadFailureStore,
    updateTimeRange,
    loadingState: { dataStreamSettingsLoading },
    view,
  } = useDatasetQualityDetailsState();

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

      {!dataStreamSettingsLoading && !canUserReadFailureStore && (
        <EuiFlexItem>
          <FailureStoreWarning />
          <EuiSpacer size="m" />
        </EuiFlexItem>
      )}

      {view === 'classic' && (
        <>
          <Summary />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiSplitPanel.Outer
        direction="row"
        data-test-subj="datasetQualityDetailsOverview"
        hasShadow={false}
        hasBorder={true}
      >
        <EuiSplitPanel.Inner color="subdued" grow={false}>
          <QualitySummaryCards
            selectedCard={selectedQualityCard}
            setSelectedCard={setSelectedQualityCard}
          />
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={true}>
          <DocumentTrends
            lastReloadTime={lastReloadTime}
            openAlertFlyout={openAlertFlyout}
            displayActions={{
              displayCreateRuleButton: selectedQualityCard === 'degraded',
              displayEditFailureStore: selectedQualityCard === 'failed' && view !== 'wired', // Don't allow editing failure store for Wired Streams
            }}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />
      <QualityIssues />
    </>
  );
}
