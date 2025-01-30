/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '@kbn/ml-url-state';
import { useJobInfoFlyouts } from '../../../../../jobs/components/job_details_flyout';
import { useGetAnalytics } from '../../../analytics_management/services/analytics_service';
import type { AnalyticStatsBarStats } from '../../../../../components/stats_bar';
import type { DataFrameAnalyticsListRow } from '../../../analytics_management/components/analytics_list/common';
import { useMlLocator, useNavigateToPath } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../locator';
import { ExpandedRow } from '../../../analytics_management/components/analytics_list/expanded_row';

export const AnalyticsDetailFlyout = () => {
  const {
    isDataFrameAnalyticsDetailsFlyoutOpen,
    closeActiveFlyout,
    setActiveJobId,
    activeJobId: analyticsId,
  } = useJobInfoFlyouts();
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(undefined);
  const [, setErrorMessage] = useState<any>(undefined);
  const [, setIsInitialized] = useState(false);
  const [, setJobsAwaitingNodeCount] = useState(0);
  const blockRefresh = false;
  const getAnalytics = useGetAnalytics(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    setJobsAwaitingNodeCount,
    blockRefresh
  );
  const getAnalyticsCallback = useCallback(
    (id: string | null) => getAnalytics(true, id),
    [getAnalytics]
  );

  // Subscribe to the refresh observable to trigger reloading the analytics list.

  useEffect(
    function getAnalyticsDetailsOnChange() {
      if (!analyticsId) {
        return;
      }
      getAnalyticsCallback(analyticsId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyticsId]
  );
  const analytic = useMemo(
    () => analytics.find((a) => a.id === analyticsId),
    [analytics, analyticsId]
  );

  const locator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();
  const [globalState] = useUrlState('_g');

  const redirectToAnalyticsList = useCallback(async () => {
    const path = await locator.getUrl({
      page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
      pageState: {
        jobId: globalState?.ml?.jobId,
      },
    });
    await navigateToPath(path, false);
  }, [locator, navigateToPath, globalState?.ml?.jobId]);

  const flyoutTitleId = `mlAnalyticsDetailsFlyout-${analyticsId}`;
  return isDataFrameAnalyticsDetailsFlyoutOpen ? (
    <EuiFlyout
      data-test-subj="analyticsDetailsFlyout"
      type="overlay"
      size="m"
      ownFocus={false}
      onClose={() => {
        closeActiveFlyout();
        setActiveJobId(null);
      }}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder data-test-subj={`analyticsDetailsFlyout-${analyticsId}`}>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>{analyticsId}</h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={redirectToAnalyticsList}>
              <FormattedMessage
                id="xpack.ml.jobDetailsFlyout.openJobsListButton"
                defaultMessage="Open jobs list"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {analytic ? (
          <ExpandedRow item={analytic} />
        ) : (
          <EuiText textAlign="center">
            <EuiLoadingSpinner />
          </EuiText>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};
