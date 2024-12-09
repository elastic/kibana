/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const KIBANA_VERSION_QUERY_PARAM = 'entry.548460210';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'entry.573002982';
const SANITIZED_PATH_PARAM = 'entry.1876422621';

const getDeploymentType = (isCloudEnv?: boolean, isServerlessEnv?: boolean): string | undefined => {
  if (isServerlessEnv) {
    return 'Serverless (fully-managed projects)';
  }
  if (isCloudEnv) {
    return 'Elastic Cloud (we manage)';
  }
  return 'Self-Managed (you manage)';
};

const getSurveyFeedbackURL = (
  formUrl: string,
  kibanaVersion?: string,
  deploymentType?: string,
  sanitizedPath?: string
) => {
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

interface FeatureFeedbackButtonProps {
  formUrl: string;
  'data-test-subj': string;
  surveyButtonText?: ReactElement;
  onClickCapture?: () => void;
  defaultButton?: boolean;
  kibanaVersion?: string;
  isCloudEnv?: boolean;
  isServerlessEnv?: boolean;
  sanitizedPath?: string;
}

export const FeatureFeedbackButton = ({
  formUrl,
  'data-test-subj': dts,
  onClickCapture,
  defaultButton,
  kibanaVersion,
  isCloudEnv,
  isServerlessEnv,
  sanitizedPath,
  surveyButtonText = (
    <FormattedMessage
      id="xpack.ml.featureFeedbackButton.tellUsWhatYouThinkLink"
      defaultMessage="Tell us what you think!"
    />
  ),
}: FeatureFeedbackButtonProps) => {
  const deploymentType =
    isCloudEnv !== undefined || isServerlessEnv !== undefined
      ? getDeploymentType(isCloudEnv, isServerlessEnv)
      : undefined;

  return (
    <EuiButton
      href={getSurveyFeedbackURL(formUrl, kibanaVersion, deploymentType, sanitizedPath)}
      target="_blank"
      color={defaultButton ? undefined : 'warning'}
      iconType={defaultButton ? undefined : 'editorComment'}
      data-test-subj={dts}
      onClickCapture={onClickCapture}
    >
      {surveyButtonText}
    </EuiButton>
  );
};
