/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { useMlKibana } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml';

import { useJobsApiService } from '../../services/ml_api_service/jobs';
import { useCloudCheck } from '../node_available_warning/hooks';
import { FeatureFeedbackButton } from './feature_feedback_button';

interface Props {
  jobIds: string[];
}

export const FeedBackButton: FC<Props> = ({ jobIds }) => {
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

  const isMounted = useMountedState();

  const ANOMALY_DETECTION_FEEDBACK_URL = 'https://ela.st/anomaly-detection-feedback';

  useEffect(() => {
    const tempJobIdsString = jobIds.join(',');
    if (tempJobIdsString === jobIdsString || tempJobIdsString === '') {
      return;
    }
    setShowButton(false);
    setJobIdsString(tempJobIdsString);

    getJobs(jobIds).then((resp) => {
      if (isMounted()) {
        setShowButton(resp.length > 0);
      }
    });
  }, [jobIds, getJobs, jobIdsString, isMounted]);

  if (showButton === false) {
    return null;
  }

  return (
    <FeatureFeedbackButton
      data-test-subj="mlFeatureFeedbackButton"
      formUrl={ANOMALY_DETECTION_FEEDBACK_URL}
      kibanaVersion={kibanaVersion}
      isCloudEnv={isCloud}
      isServerlessEnv={showNodeInfo === false}
      sanitizedPath={window.location.pathname}
    />
  );
};
