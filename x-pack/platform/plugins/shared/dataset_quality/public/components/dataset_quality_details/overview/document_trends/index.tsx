/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram';
import React, { useCallback } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  discoverAriaText,
  openInDiscoverText,
  createAlertText,
  editFailureStoreText,
} from '../../../../../common/translations';
import {
  useDatasetDetailsTelemetry,
  useDatasetQualityDetailsState,
  useFailureStoreModal,
  useQualityIssuesDocsChart,
} from '../../../../hooks';
import { TrendDocsChart } from './trend_docs_chart';
import { useKibanaContextForPlugin } from '../../../../utils/use_kibana';
import { getAlertingCapabilities } from '../../../../alerts/get_alerting_capabilities';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DocumentTrends({
  lastReloadTime,
  openAlertFlyout,
  displayActions: { displayCreateRuleButton, displayEditFailureStore },
}: {
  lastReloadTime: number;
  openAlertFlyout: () => void;
  displayActions: {
    displayCreateRuleButton: boolean;
    displayEditFailureStore: boolean;
  };
}) {
  const { timeRange, updateTimeRange } = useDatasetQualityDetailsState();
  const {
    dataView,
    breakdown,
    redirectLinkProps,
    handleDocsTrendChartChange,
    ...qualityIssuesChartProps
  } = useQualityIssuesDocsChart();

  const { trackDatasetDetailsBreakdownFieldChanged } = useDatasetDetailsTelemetry();

  const {
    services: { application, alerting },
  } = useKibanaContextForPlugin();
  const { capabilities } = application;
  const { isAlertingAvailable } = getAlertingCapabilities(alerting, capabilities);

  const onTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end });
    },
    [updateTimeRange]
  );

  const onBreakdownFieldChange = useCallback(
    (breakdownField: DataViewField | undefined) => {
      trackDatasetDetailsBreakdownFieldChanged();
      breakdown.onChange(breakdownField);
    },
    [breakdown, trackDatasetDetailsBreakdownFieldChanged]
  );

  const {
    openModal: openFailureStoreModal,
    canUserManageFailureStore,
    renderModal: renderFailureStoreModal,
  } = useFailureStoreModal();

  return (
    <>
      <EuiFlexGroup alignItems="stretch" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiSkeletonRectangle width={160} height={32} isLoading={!dataView}>
            <UnifiedBreakdownFieldSelector
              dataView={dataView!}
              breakdown={{
                field:
                  breakdown.dataViewField && breakdown.fieldSupportsBreakdown
                    ? breakdown.dataViewField
                    : undefined,
              }}
              onBreakdownFieldChange={onBreakdownFieldChange}
            />
          </EuiSkeletonRectangle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiToolTip content={openInDiscoverText}>
              <EuiButtonIcon
                display="base"
                iconType="discoverApp"
                aria-label={discoverAriaText}
                size="s"
                data-test-subj="datasetQualityDetailsLinkToDiscover"
                {...redirectLinkProps.linkProps}
                color="text"
              />
            </EuiToolTip>
            {displayCreateRuleButton && isAlertingAvailable && (
              <EuiToolTip content={createAlertText} disableScreenReaderOutput>
                <EuiButtonIcon
                  display="base"
                  iconType="bell"
                  aria-label={createAlertText}
                  size="s"
                  data-test-subj="datasetQualityDetailsCreateRule"
                  onClick={openAlertFlyout}
                  color="text"
                />
              </EuiToolTip>
            )}
            {displayEditFailureStore && canUserManageFailureStore && (
              <EuiToolTip content={editFailureStoreText} disableScreenReaderOutput>
                <EuiButtonIcon
                  display="base"
                  iconType="pencil"
                  aria-label={editFailureStoreText}
                  size="s"
                  data-test-subj="datasetQualityDetailsEditFailureStore"
                  onClick={openFailureStoreModal}
                  color="text"
                />
              </EuiToolTip>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TrendDocsChart
        {...qualityIssuesChartProps}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
        onTimeRangeChange={onTimeRangeChange}
      />
      {renderFailureStoreModal()}
    </>
  );
}
