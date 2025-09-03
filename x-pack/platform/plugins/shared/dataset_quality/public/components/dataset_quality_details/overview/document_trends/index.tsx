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
import {
  discoverAriaText,
  openInDiscoverText,
  createAlertText,
} from '../../../../../common/translations';
import { useDatasetQualityDetailsState, useQualityIssuesDocsChart } from '../../../../hooks';
import { TrendDocsChart } from './trend_docs_chart';
import { useKibanaContextForPlugin } from '../../../../utils/use_kibana';
import { getAlertingCapabilities } from '../../../../alerts/get_alerting_capabilities';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DocumentTrends({
  lastReloadTime,
  displayCreateRuleButton,
  openAlertFlyout,
}: {
  lastReloadTime: number;
  displayCreateRuleButton: boolean;
  openAlertFlyout: () => void;
}) {
  const { timeRange, updateTimeRange } = useDatasetQualityDetailsState();
  const {
    dataView,
    breakdown,
    redirectLinkProps,
    handleDocsTrendChartChange,
    ...qualityIssuesChartProps
  } = useQualityIssuesDocsChart();

  const {
    services: { application, alerting },
  } = useKibanaContextForPlugin();
  const { capabilities } = application;
  const { isAlertingAvailable } = getAlertingCapabilities(alerting, capabilities);

  const onTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end, refreshInterval: timeRange.refresh.value });
    },
    [updateTimeRange, timeRange.refresh]
  );

  return (
    <>
      <EuiSpacer size="m" />
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
              onBreakdownFieldChange={breakdown.onChange}
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
              />
            </EuiToolTip>
            {displayCreateRuleButton && isAlertingAvailable && (
              <EuiToolTip content={createAlertText}>
                <EuiButtonIcon
                  display="base"
                  iconType="bell"
                  aria-label={createAlertText}
                  size="s"
                  data-test-subj="datasetQualityDetailsCreateRule"
                  onClick={openAlertFlyout}
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
    </>
  );
}
