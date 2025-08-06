/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  useEuiTheme,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewPanelDatasetQualityIndicatorFailedDocs,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { useQualityIssuesDocsChart } from '../../../../hooks/use_quality_issues_docs_chart';
import { DatasetQualityIndicator, QualityPercentageIndicator } from '../../../quality_indicator';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function QualitySummaryCards({
  selectedCard,
  setSelectedCard,
}: {
  selectedCard: 'degraded' | 'failed';
  setSelectedCard: React.Dispatch<React.SetStateAction<'degraded' | 'failed'>>;
}) {
  const { euiTheme } = useEuiTheme();
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

  return (
    <EuiFlexGroup gutterSize="m" direction="column" style={{ height: '100%' }}>
      <EuiFlexItem grow={true}>
        <EuiButtonEmpty
          isSelected={true}
          onClick={() => {
            handleDocsTrendChartChange('degraded');
            setSelectedCard('degraded');
          }}
          css={css`
            border: ${selectedCard === 'degraded'
              ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary}`
              : 'none'} !important;
            background-color: ${selectedCard === 'degraded'
              ? euiTheme.colors.backgroundLightPrimary
              : 'inherit'};
            height: 100%;
            min-width: 300px;
          `}
          contentProps={{
            css: css`
              justify-content: flex-start;
            `,
          }}
        >
          <EuiText textAlign="left">{overviewPanelDatasetQualityIndicatorDegradedDocs}</EuiText>
          <EuiSpacer size="xs" />
          <EuiText textAlign="left">
            <h2>{totalDegradedDocsCount}</h2>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <QualityPercentageIndicator
                percentage={degradedPercentage}
                docsCount={+totalDocsCount}
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
                quality={degradedQuality}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiButtonEmpty
          onClick={() => {
            handleDocsTrendChartChange('failed');
            setSelectedCard('failed');
          }}
          css={css`
            border: ${selectedCard === 'failed'
              ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary}`
              : 'none'};
            background-color: ${selectedCard === 'failed'
              ? euiTheme.colors.backgroundLightPrimary
              : 'inherit'};
            height: 100%;
            min-width: 300px;
          `}
          contentProps={{
            css: css`
              justify-content: flex-start;
            `,
          }}
        >
          <EuiText textAlign="left">{overviewPanelDatasetQualityIndicatorFailedDocs}</EuiText>
          <EuiSpacer size="xs" />
          <EuiText textAlign="left">
            <h2>{totalFailedDocsCount}</h2>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <QualityPercentageIndicator
                percentage={failedPercentage}
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
              <DatasetQualityIndicator isLoading={isSummaryPanelLoading} quality={failedQuality} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
