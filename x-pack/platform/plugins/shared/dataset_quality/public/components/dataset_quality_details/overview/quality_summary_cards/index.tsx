/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewPanelDatasetQualityIndicatorFailedDocs,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { useQualityIssuesDocsChart } from '../../../../hooks/use_quality_issues_docs_chart';
import { useDatasetQualityDetailsState } from '../../../../hooks/use_dataset_quality_details_state';
import { DatasetQualityIndicator, QualityPercentageIndicator } from '../../../quality_indicator';
import { useKibanaContextForPlugin } from '../../../../utils/use_kibana';
import { Card } from './card';

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
    dataStream,
    canUserReadFailureStore,
    hasFailureStore,
    loadingState: { dataStreamSettingsLoading },
  } = useDatasetQualityDetailsState();

  const {
    services: {
      share: { url: urlService },
    },
  } = useKibanaContextForPlugin();

  const locator = urlService.locators.get('INDEX_MANAGEMENT_LOCATOR_ID');
  const locatorParams = { page: 'data_streams_details', dataStreamName: dataStream } as const;

  return (
    <EuiFlexGroup gutterSize="m" direction="column" style={{ height: '100%' }}>
      <EuiFlexItem grow={true}>
        <Card
          isDisabled={false}
          isSelected={selectedCard === 'degraded'}
          title={overviewPanelDatasetQualityIndicatorDegradedDocs}
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
        {!dataStreamSettingsLoading && !hasFailureStore && canUserReadFailureStore ? (
          <Card
            isDisabled={true}
            title={overviewPanelDatasetQualityIndicatorFailedDocs}
            kpiValue={i18n.translate('xpack.datasetQuality.noFailureStoreTitle', {
              defaultMessage: 'No failure store',
            })}
            footer={
              <EuiLink
                href={locator?.getRedirectUrl(locatorParams)}
                target="_blank"
                external={false}
              >
                {i18n.translate('xpack.datasetQuality.enableFailureStore', {
                  defaultMessage: 'Enable failure store',
                })}
              </EuiLink>
            }
          />
        ) : (
          <Card
            isDisabled={false}
            isSelected={selectedCard === 'failed'}
            title={overviewPanelDatasetQualityIndicatorFailedDocs}
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
