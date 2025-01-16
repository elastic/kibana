/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHealth,
  EuiIconTip,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { InfoIndicators } from '../../../../common/types';
import { useSummaryPanelContext } from '../../../hooks';
import {
  summaryPanelQualityDegradedText,
  summaryPanelQualityGoodText,
  summaryPanelQualityPoorText,
  summaryPanelQualityText,
  summaryPanelQualityTooltipText,
} from '../../../../common/translations';
import { useDatasetQualityFilters } from '../../../hooks/use_dataset_quality_filters';
import { VerticalRule } from '../../common/vertical_rule';

export function DatasetsQualityIndicators() {
  const { onPageReady } = usePerformanceContext();
  const { timeRange } = useDatasetQualityFilters();
  const { datasetsQuality, isDatasetsQualityLoading, numberOfDatasets, numberOfDocuments } =
    useSummaryPanelContext();

  if (!isDatasetsQualityLoading && (numberOfDatasets || numberOfDocuments)) {
    onPageReady({
      customMetrics: {
        key1: 'datasets',
        value1: numberOfDatasets,
        key2: 'documents',
        value2: numberOfDocuments,
      },
      meta: {
        rangeFrom: timeRange.from,
        rangeTo: timeRange.to,
      },
    });
  }

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{summaryPanelQualityText}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={summaryPanelQualityTooltipText} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
          <QualityIndicator
            value={datasetsQuality.poor}
            quality="danger"
            description={summaryPanelQualityPoorText}
            isLoading={isDatasetsQualityLoading}
          />
          <VerticalRule />
          <QualityIndicator
            value={datasetsQuality.degraded}
            quality="warning"
            description={summaryPanelQualityDegradedText}
            isLoading={isDatasetsQualityLoading}
          />
          <VerticalRule />
          <QualityIndicator
            value={datasetsQuality.good}
            quality="success"
            description={summaryPanelQualityGoodText}
            isLoading={isDatasetsQualityLoading}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const QualityIndicator = ({
  value,
  quality,
  description,
  isLoading,
}: {
  value: number;
  quality: InfoIndicators;
  description: string;
  isLoading: boolean;
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isLoading ? (
        <EuiSkeletonTitle size="m" />
      ) : (
        <EuiTitle size="m">
          <h3>
            <EuiHealth
              data-test-subj={`datasetQualityDatasetHealthKpi-${description}`}
              textSize="inherit"
              color={quality}
            >
              {value || 0}
            </EuiHealth>
          </h3>
        </EuiTitle>
      )}
      <EuiText color={quality}>
        <h5>{description}</h5>
      </EuiText>
    </EuiFlexGroup>
  );
};
