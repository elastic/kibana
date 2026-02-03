/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { useMlKibana } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml';

import { useCloudCheck } from '../node_available_warning/hooks';

interface Props {
  jobIds: string[];
}

const KIBANA_VERSION_QUERY_PARAM = 'version';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'deployment_type';
const SANITIZED_PATH_PARAM = 'path';
const FEEDBACK_BUTTON_DEFAULT_TEXT = i18n.translate('xpack.ml.feedbackButton.defaultText', {
  defaultMessage: 'Give feedback',
});
const ANOMALY_DETECTION_FEEDBACK_URL = 'https://ela.st/anomaly-detection-feedback';

const getDeploymentType = (isCloudEnv?: boolean, isServerlessEnv?: boolean): string | undefined => {
  if (isCloudEnv === undefined || isServerlessEnv === undefined) {
    return undefined;
  }
  if (isServerlessEnv) {
    return 'Serverless';
  }
  if (isCloudEnv) {
    return 'Elastic Cloud';
  }
  return 'Self-Managed';
};

export const getSurveyFeedbackURL = ({
  formUrl,
  kibanaVersion,
  sanitizedPath,
  isCloudEnv,
  isServerlessEnv,
}: {
  formUrl: string;
  kibanaVersion?: string;
  sanitizedPath?: string;
  isCloudEnv?: boolean;
  isServerlessEnv?: boolean;
}) => {
  const deploymentType = getDeploymentType(isCloudEnv, isServerlessEnv);

  const url = new URL(formUrl);
  if (kibanaVersion) {
    url.searchParams.append(KIBANA_VERSION_QUERY_PARAM, kibanaVersion);
  }
  if (deploymentType) {
    url.searchParams.append(KIBANA_DEPLOYMENT_TYPE_PARAM, deploymentType);
  }
  if (sanitizedPath) {
    url.searchParams.append(SANITIZED_PATH_PARAM, sanitizedPath);
  }

  return url.href;
};

export const FeedBackButton: FC<Props> = ({ jobIds }) => {
  const {
    services: { kibanaVersion, notifications },
  } = useMlKibana();
  const { isCloud: isCloudEnv } = useCloudCheck();
  // ML does not have an explicit isServerless flag,
  // it does however have individual feature flags which are set depending
  // whether the environment is serverless or not.
  // showNodeInfo will always be false in a serverless environment
  // and true in a non-serverless environment.
  const { showNodeInfo } = useEnabledFeatures();
  const isFeedbackEnabled = notifications.feedback.isEnabled();

  const href = useMemo(() => {
    if (jobIds.length === 0) {
      return;
    }
    return getSurveyFeedbackURL({
      formUrl: ANOMALY_DETECTION_FEEDBACK_URL,
      kibanaVersion,
      isCloudEnv,
      isServerlessEnv: showNodeInfo === false,
      sanitizedPath: window.location.pathname,
    });
  }, [isCloudEnv, jobIds.length, kibanaVersion, showNodeInfo]);

  if (jobIds.length === 0) {
    return null;
  }

  if (!isFeedbackEnabled) return null;

  return (
    <EuiButtonEmpty
      aria-label={FEEDBACK_BUTTON_DEFAULT_TEXT}
      href={href}
      size="s"
      iconType={'popout'}
      iconSide="right"
      target="_blank"
      data-test-subj={'mlFeatureFeedbackButton'}
      color="primary"
    >
      {FEEDBACK_BUTTON_DEFAULT_TEXT}
    </EuiButtonEmpty>
  );
};
