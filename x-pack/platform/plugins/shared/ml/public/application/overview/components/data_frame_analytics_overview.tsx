/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_PAGES } from '../../../locator';
import dfaImage from '../../data_frame_analytics/pages/analytics_management/components/empty_prompt/data_frame_analytics_kibana.png';
import { usePermissionCheck } from '../../capabilities/check_capabilities';
import { useMlApi, useMlLocator, useMlManagementLocator } from '../../contexts/kibana';
import { mlNodesAvailable } from '../../ml_nodes_check';

export const DataFrameAnalyticsOverviewCard: FC = () => {
  const mlLocator = useMlLocator();
  const mlManagementLocator = useMlManagementLocator();

  const [hasDFAs, setHasDFAs] = useState(false);
  const [canCreateDataFrameAnalytics, canStartStopDataFrameAnalytics] = usePermissionCheck([
    'canCreateDataFrameAnalytics',
    'canStartStopDataFrameAnalytics',
  ]);

  const disabled =
    !mlNodesAvailable() || !canCreateDataFrameAnalytics || !canStartStopDataFrameAnalytics;

  const navigateToSourceSelection = useCallback(async () => {
    if (!mlManagementLocator) return;

    await mlManagementLocator.navigate({
      sectionId: 'ml',
      appId: `analytics/${ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION}`,
    });
  }, [mlManagementLocator]);

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
    if (!hasDFAs && !disabled) {
      return [
        <EuiButton
          onClick={navigateToSourceSelection}
          isDisabled={disabled}
          color="primary"
          data-test-subj="mlAnalyticsCreateFirstButton"
        >
          {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
            defaultMessage: 'Create data frame analytics job',
          })}
        </EuiButton>,
      ];
    }

    if (hasDFAs) {
      actions.push(
        <EuiButton
          color="primary"
          onClick={navigateToResultsExplorer}
          isDisabled={disabled}
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
        <EuiButtonEmpty
          color="primary"
          onClick={navigateToDFAManagementPath}
          isDisabled={disabled}
          data-test-subj="mlAnalyticsManageDFAJobsButton"
          iconType="popout"
          iconSide="left"
        >
          <FormattedMessage
            id="xpack.ml.overview.dataFrameAnalytics.manageJobsButton"
            defaultMessage="Manage jobs"
          />
        </EuiButtonEmpty>
      );
    }
    return actions;
  }, [
    disabled,
    navigateToSourceSelection,
    navigateToDFAManagementPath,
    hasDFAs,
    navigateToResultsExplorer,
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

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      hasBorder={true}
      hasShadow={false}
      icon={
        <EuiImage
          size="fullWidth"
          src={dfaImage}
          alt={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
            defaultMessage: 'Trained analysis of your data',
          })}
        />
      }
      title={
        <h4>
          <FormattedMessage
            id="xpack.ml.dataFrame.analyticsList.emptyPromptTitle"
            defaultMessage="Trained analysis of your data"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.ml.overview.analyticsList.emptyPromptText"
            defaultMessage="Train outlier detection, regression, or classification machine learning models using data frame analytics."
          />
        </p>
      }
      actions={availableActions}
      // footer={
      //   <EuiLink href={docLinks.links.ml.dataFrameAnalytics} target="_blank" external>
      //     <FormattedMessage
      //       id="xpack.ml.common.readDocumentationLink"
      //       defaultMessage="Read documentation"
      //     />
      //   </EuiLink>
      // }
      data-test-subj="mlOverviewDataFrameAnalyticsCard"
    />
  );
};
