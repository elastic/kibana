/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { MlPages } from '../../../locator';
import { ML_PAGES } from '../../../locator';
import { useMlKibana } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml';

import { useJobsApiService } from '../../services/ml_api_service/jobs';
import { useCloudCheck } from '../node_available_warning/hooks';
import { FeatureFeedbackButton } from './feature_feedback_button';

interface Props {
  jobIds: string[];
  page: MlPages;
}

const FORM_IDS = {
  SINGLE_METRIC_VIEWER: '1FAIpQLSdlMYe3wuJh2KtBLajI4EVoUljAhGjJwjZI7zUY_Kn_Sr2lug',
  ANOMALY_EXPLORER: '1FAIpQLSfF1Ry561b4lYrY7iiyXhuZpxFzAmy2c9BFUT3J2AJUevY1iw',
};

const MATCHED_CREATED_BY_TAGS = ['ml-module-metrics-ui-hosts'];

export const FeedBackButton: FC<Props> = ({ jobIds, page }) => {
  const { jobs: getJobs } = useJobsApiService();
  const {
    services: { kibanaVersion },
  } = useMlKibana();
  const { isCloud } = useCloudCheck();
  // ML does not have an explicit isServerless flag,
  // it does however have individual feature flags which are set depending
  // whether the environment is serverless or not.
  // showNodeInfo will always be false in a serverless environment
  // and true in a non-serverless environment.
  const { showNodeInfo } = useEnabledFeatures();

  const [jobIdsString, setJobIdsString] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(false);

  const formId = useMemo(() => getFormId(page), [page]);
  const isMounted = useMountedState();

  useEffect(() => {
    const tempJobIdsString = jobIds.join(',');
    if (tempJobIdsString === jobIdsString || tempJobIdsString === '') {
      return;
    }
    setShowButton(false);
    setJobIdsString(tempJobIdsString);

    getJobs(jobIds).then((resp) => {
      if (isMounted()) {
        setShowButton(
          resp.some((job) => MATCHED_CREATED_BY_TAGS.includes(job.custom_settings?.created_by))
        );
      }
    });
  }, [jobIds, getJobs, jobIdsString, isMounted]);

  if (showButton === false || formId === null) {
    return null;
  }

  return (
    <FeatureFeedbackButton
      data-test-subj="mlFeatureFeedbackButton"
      formUrl={getFormUrl(formId)}
      kibanaVersion={kibanaVersion}
      isCloudEnv={isCloud}
      isServerlessEnv={showNodeInfo === false}
    />
  );
};

function getFormId(page: MlPages) {
  switch (page) {
    case ML_PAGES.SINGLE_METRIC_VIEWER:
      return FORM_IDS.SINGLE_METRIC_VIEWER;
    case ML_PAGES.ANOMALY_EXPLORER:
      return FORM_IDS.ANOMALY_EXPLORER;
    default:
      return null;
  }
}

function getFormUrl(formId: string) {
  return `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`;
}
