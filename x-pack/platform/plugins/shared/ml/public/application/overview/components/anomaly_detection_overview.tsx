/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MlSummaryJobs } from '../../../../common/types/anomaly_detection_jobs';
import { ML_PAGES } from '../../../locator';
import adImage from '../../jobs/jobs_list/components/anomaly_detection_empty_state/anomaly_detection_kibana.png';
import { usePermissionCheck } from '../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../ml_nodes_check';
import { useMlApi, useMlLocator, useMlManagementLocator } from '../../contexts/kibana';
import { AnomalyDetectionEmptyState } from '../../jobs/jobs_list/components/anomaly_detection_empty_state/anomaly_detection_empty_state';
import { MLEmptyPromptCard } from '../../components/overview/ml_empty_prompt_card';

export const AnomalyDetectionOverviewCard: FC = () => {
  const [canGetJobs, canCreateJob] = usePermissionCheck(['canGetJobs', 'canCreateJob']);
  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();
  const [isLoading, setIsLoading] = useState(false);
  const [hasADJobs, setHasADJobs] = useState(false);

  const mlApi = useMlApi();
  const mlLocator = useMlLocator();
  const mlManagementLocator = useMlManagementLocator();

  const loadJobs = useCallback(async () => {
    setIsLoading(true);

    try {
      const jobsResult: MlSummaryJobs = await mlApi.jobs.jobsSummary([]);
      if (jobsResult?.length > 0) {
        setHasADJobs(true);
      }
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }, [mlApi]);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectToMultiMetricExplorer = useCallback(async () => {
    if (!mlLocator) return;

    await mlLocator.navigate({
      sectionId: 'ml',
      page: ML_PAGES.ANOMALY_EXPLORER,
    });
  }, [mlLocator]);

  const redirectToManageJobs = useCallback(async () => {
    if (!mlManagementLocator) return;

    await mlManagementLocator.navigate({
      sectionId: 'ml',
      appId: `anomaly_detection`,
    });
  }, [mlManagementLocator]);

  const showEmptyState = !isLoading && !hasADJobs;

  const availableActions = useMemo(() => {
    const actions: React.ReactNode[] = [];
    if (hasADJobs) {
      actions.push(
        <EuiButton
          color="primary"
          fill
          onClick={redirectToMultiMetricExplorer}
          isDisabled={!canGetJobs}
          data-test-subj="multiMetricExplorerButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.anomalyExplorerButtonText"
            defaultMessage="Anomaly explorer"
          />
        </EuiButton>
      );
    }
    if (canGetJobs && canCreateJob) {
      actions.push(
        <EuiButton
          color="primary"
          onClick={redirectToManageJobs}
          isDisabled={disableCreateAnomalyDetectionJob}
          data-test-subj="manageJobsButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.manageJobsButton"
            defaultMessage="Manage jobs"
          />
        </EuiButton>
      );
    }
    return actions;
  }, [
    disableCreateAnomalyDetectionJob,
    hasADJobs,
    canCreateJob,
    canGetJobs,
    redirectToMultiMetricExplorer,
    redirectToManageJobs,
  ]);

  return showEmptyState ? (
    <AnomalyDetectionEmptyState />
  ) : (
    <MLEmptyPromptCard
      layout="horizontal"
      hasBorder={true}
      hasShadow={false}
      iconSrc={adImage}
      iconAlt={i18n.translate('xpack.ml.overview.anomalyDetection.title', {
        defaultMessage: 'Anomaly detection',
      })}
      title={i18n.translate('xpack.ml.overview.anomalyDetection.createFirstJobMessage', {
        defaultMessage: 'Spot anomalies faster',
      })}
      body={
        <p>
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.emptyPromptText"
            defaultMessage="Start automatically spotting anomalies hiding in your time series data and resolve issues faster."
          />
        </p>
      }
      actions={availableActions}
      data-test-subj="mlOverviewAnomalyDetectionCard"
    />
  );
};
