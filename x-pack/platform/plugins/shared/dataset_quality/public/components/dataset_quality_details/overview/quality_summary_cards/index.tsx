/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCode, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewPanelDatasetQualityIndicatorFailedDocs,
  enableFailureStoreButtonLabel,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { useQualityIssuesDocsChart } from '../../../../hooks/use_quality_issues_docs_chart';
import { useDatasetQualityDetailsState } from '../../../../hooks/use_dataset_quality_details_state';
import { useFailureStoreModal } from '../../../../hooks/use_failure_store_modal';
import { DatasetQualityIndicator, QualityPercentageIndicator } from '../../../quality_indicator';
import { Card } from './card';

const degradedDocTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.degradedDocTooltip"
    defaultMessage="Documents with the {ignoredProperty} property, usually due to malformed fields or exceeding the limit of total fields when {ignoredAboveSetting}."
    values={{
      ignoredProperty: <EuiCode transparentBackground>_ignored</EuiCode>,
      ignoredAboveSetting: <EuiCode transparentBackground>_ignore_above: false</EuiCode>,
    }}
  />
);

const failedDocTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.failedDocTooltip"
    defaultMessage="Documents that were rejected during ingestion, usually due to mapping errors or pipeline failures."
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function QualitySummaryCards({
  selectedCard,
  setSelectedCard,
}: {
  selectedCard: 'degraded' | 'failed';
  setSelectedCard: React.Dispatch<React.SetStateAction<'degraded' | 'failed'>>;
}) {
  const {
    totalDocsCount,
    isSummaryPanelLoading,
    totalDegradedDocsCount,
    totalFailedDocsCount,
    degradedPercentage,
    failedPercentage,
    degradedQuality,
    failedQuality,
  } = useOverviewSummaryPanel();
  const { handleDocsTrendChartChange } = useQualityIssuesDocsChart();
  const {
    loadingState: { dataStreamSettingsLoading, dataStreamDetailsLoading },
  } = useDatasetQualityDetailsState();

  const {
    openModal,
    canUserReadFailureStore,
    canUserManageFailureStore,
    hasFailureStore,
    renderModal: renderFailureStoreModal,
  } = useFailureStoreModal();
  return (
    <EuiFlexGroup gutterSize="m" direction="column" style={{ height: '100%' }}>
      <EuiFlexItem grow={true}>
        <Card
          isDisabled={false}
          isSelected={selectedCard === 'degraded'}
          title={overviewPanelDatasetQualityIndicatorDegradedDocs}
          titleTooltipContent={degradedDocTooltip}
          kpiValue={totalDegradedDocsCount}
          footer={
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <QualityPercentageIndicator
                  percentage={degradedPercentage}
                  docsCount={+totalDocsCount}
                  fewDocsTooltipContent={(degradedDocsCount: number) =>
                    i18n.translate('xpack.datasetQuality.fewDegradedDocsTooltip', {
                      defaultMessage: '{degradedDocsCount} degraded docs in this data set.',
                      values: {
                        degradedDocsCount,
                      },
                    })
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DatasetQualityIndicator
                  isLoading={isSummaryPanelLoading}
                  quality={degradedQuality}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          onClick={() => {
            handleDocsTrendChartChange('degraded');
            setSelectedCard('degraded');
          }}
          isLoading={dataStreamSettingsLoading || dataStreamDetailsLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        {dataStreamSettingsLoading ||
        dataStreamDetailsLoading ||
        (hasFailureStore && canUserReadFailureStore) ? (
          <Card
            isLoading={dataStreamSettingsLoading || dataStreamDetailsLoading}
            isDisabled={false}
            isSelected={selectedCard === 'failed'}
            title={overviewPanelDatasetQualityIndicatorFailedDocs}
            titleTooltipContent={failedDocTooltip}
            kpiValue={totalFailedDocsCount}
            footer={
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <QualityPercentageIndicator
                    percentage={failedPercentage}
                    docsCount={+totalFailedDocsCount}
                    fewDocsTooltipContent={(failedDocsCount: number) =>
                      i18n.translate('xpack.datasetQuality.fewFailedDocsTooltip', {
                        defaultMessage: '{failedDocsCount} failed docs in this data set.',
                        values: {
                          failedDocsCount,
                        },
                      })
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DatasetQualityIndicator
                    isLoading={isSummaryPanelLoading}
                    quality={failedQuality}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            onClick={() => {
              handleDocsTrendChartChange('failed');
              setSelectedCard('failed');
            }}
          />
        ) : (
          <>
            <Card
              isDisabled={true}
              title={overviewPanelDatasetQualityIndicatorFailedDocs}
              titleTooltipContent={failedDocTooltip}
              kpiValue={i18n.translate('xpack.datasetQuality.noFailureStoreTitle', {
                defaultMessage: 'No failure store',
              })}
              footer={
                canUserManageFailureStore && (
                  <EuiText size="s">
                    <EuiLink
                      onClick={openModal}
                      data-test-subj="datasetQualityDetailsEnableFailureStoreButton"
                      aria-label={enableFailureStoreButtonLabel}
                    >
                      {enableFailureStoreButtonLabel}
                    </EuiLink>
                  </EuiText>
                )
              }
              dataTestSubjTitle="noFailureStore"
            />
            {renderFailureStoreModal()}
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
