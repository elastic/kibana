/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_PAGES } from '../../../locator';
import dfaImage from '../../data_frame_analytics/pages/analytics_management/components/empty_prompt/data_frame_analytics_kibana.png';
import { usePermissionCheck } from '../../capabilities/check_capabilities';
import { useMlApi, useMlLocator, useMlManagementLocator } from '../../contexts/kibana';
import { mlNodesAvailable } from '../../ml_nodes_check';
import { MLEmptyPromptCard } from '../../components/overview/ml_empty_prompt_card';
import { AnalyticsEmptyPrompt } from '../../data_frame_analytics/pages/analytics_management/components/empty_prompt/empty_prompt';
export const DataFrameAnalyticsOverviewCard: FC = () => {
  const mlLocator = useMlLocator();
  const mlManagementLocator = useMlManagementLocator();

  const [hasDFAs, setHasDFAs] = useState(false);
  const [canCreateDataFrameAnalytics, canStartStopDataFrameAnalytics, canGetDataFrameAnalytics] =
    usePermissionCheck([
      'canCreateDataFrameAnalytics',
      'canStartStopDataFrameAnalytics',
      'canGetDataFrameAnalytics',
    ]);

  const disabled =
    !mlNodesAvailable() || !canCreateDataFrameAnalytics || !canStartStopDataFrameAnalytics;

  const navigateToResultsExplorer = useCallback(async () => {
    if (!mlLocator) return;

    await mlLocator.navigate({
      sectionId: 'ml',
      page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    });
  }, [mlLocator]);

  const navigateToDFAManagementPath = useCallback(async () => {
    if (!mlManagementLocator) return;

    await mlManagementLocator.navigate({
      sectionId: 'ml',
      appId: `analytics`,
    });
  }, [mlManagementLocator]);

  const availableActions = useMemo(() => {
    const actions: React.ReactNode[] = [];
    if (hasDFAs) {
      actions.push(
        <EuiButton
          fill
          color="primary"
          onClick={navigateToResultsExplorer}
          isDisabled={!canGetDataFrameAnalytics}
          data-test-subj="mlAnalyticsResultsExplorerButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.dataFrameAnalytics.resultsExplorerButtonText"
            defaultMessage="Results explorer"
          />
        </EuiButton>
      );
    }
    if (!disabled) {
      actions.push(
        <EuiButton
          color="primary"
          onClick={navigateToDFAManagementPath}
          isDisabled={disabled}
          data-test-subj="mlAnalyticsManageDFAJobsButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.dataFrameAnalytics.manageJobsButton"
            defaultMessage="Manage jobs"
          />
        </EuiButton>
      );
    }
    return actions;
  }, [
    disabled,
    navigateToDFAManagementPath,
    hasDFAs,
    navigateToResultsExplorer,
    canGetDataFrameAnalytics,
  ]);

  const mlApi = useMlApi();
  useEffect(() => {
    const fetchAnalytics = async () => {
      const analyticsConfigs = await mlApi.dataFrameAnalytics.getDataFrameAnalytics();
      if (analyticsConfigs?.count > 0) {
        setHasDFAs(true);
      }
    };
    fetchAnalytics();
  }, [mlApi]);

  return !hasDFAs ? (
    <AnalyticsEmptyPrompt />
  ) : (
    <MLEmptyPromptCard
      iconSrc={dfaImage}
      iconAlt={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
        defaultMessage: 'Trained analysis of your data',
      })}
      title={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
        defaultMessage: 'Trained analysis of your data',
      })}
      body={
        <FormattedMessage
          id="xpack.ml.overview.analyticsList.emptyPromptText"
          defaultMessage="Train outlier detection, regression, or classification machine learning models using data frame analytics."
        />
      }
      actions={availableActions}
      data-test-subj="mlOverviewDataFrameAnalyticsCard"
    />
  );
};
