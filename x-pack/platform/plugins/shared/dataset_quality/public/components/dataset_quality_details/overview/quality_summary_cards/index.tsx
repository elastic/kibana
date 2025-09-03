/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiCode } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FailureStoreModal } from '@kbn/failure-store-modal';
import {
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewPanelDatasetQualityIndicatorFailedDocs,
  overviewPanelDatasetQualityIndicatorNoFailureStore,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { useQualityIssuesDocsChart } from '../../../../hooks/use_quality_issues_docs_chart';
import { useDatasetQualityDetailsState } from '../../../../hooks/use_dataset_quality_details_state';
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
    canUserReadFailureStore,
    hasFailureStore,
    loadingState: { dataStreamSettingsLoading },
    defaultRetentionPeriod,
    customRetentionPeriod,
    updateFailureStore,
  } = useDatasetQualityDetailsState();

  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const handleSaveModal = async (data: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }) => {
    updateFailureStore({
      failureStoreEnabled: data.failureStoreEnabled,
      customRetentionPeriod: data.customRetentionPeriod,
    });
    closeModal();
  };

  const onClick = () => {
    setIsFailureStoreModalOpen(true);
  };

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
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        {!dataStreamSettingsLoading && !(hasFailureStore && canUserReadFailureStore) ? (
          <>
            <Card
              isDisabled={true}
              title={overviewPanelDatasetQualityIndicatorNoFailureStore}
              titleTooltipContent={failedDocTooltip}
              kpiValue={i18n.translate('xpack.datasetQuality.noFailureStoreTitle', {
                defaultMessage: 'No failure store',
              })}
              footer={
                canUserReadFailureStore && (
                  <EuiButtonEmpty
                    onClick={onClick}
                    data-test-subj="datasetQualityDetailsEnableFailureStoreButton"
                  >
                    {i18n.translate('xpack.datasetQuality.enableFailureStore', {
                      defaultMessage: 'Enable failure store',
                    })}
                  </EuiButtonEmpty>
                )
              }
            />
            {canUserReadFailureStore && isFailureStoreModalOpen && defaultRetentionPeriod && (
              <FailureStoreModal
                onCloseModal={closeModal}
                onSaveModal={handleSaveModal}
                failureStoreProps={{
                  failureStoreEnabled: hasFailureStore,
                  defaultRetentionPeriod,
                  customRetentionPeriod,
                }}
              />
            )}
          </>
        ) : (
          <Card
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
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
