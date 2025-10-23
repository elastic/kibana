/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';

const KIBANA_VERSION_QUERY_PARAM = 'version';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'deployment_type';
const SANITIZED_PATH_PARAM = 'path';
const FEEDBACK_BUTTON_DEFAULT_TEXT = i18n.translate('xpack.ml.featureFeedbackButton.defaultText', {
  defaultMessage: 'Give feedback',
});

const getDeploymentType = (isCloudEnv?: boolean, isServerlessEnv?: boolean): string | undefined => {
  if (isCloudEnv === undefined && isServerlessEnv === undefined) {
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
  deploymentType?: string;
  sanitizedPath?: string;
  mlJobType?: string;
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

interface FeatureFeedbackButtonProps {
  formUrl: string;
  'data-test-subj': string;
  surveyButtonText?: string;
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
  surveyButtonText = FEEDBACK_BUTTON_DEFAULT_TEXT,
}: FeatureFeedbackButtonProps) => {
  return (
    <EuiButtonEmpty
      aria-label={surveyButtonText ?? FEEDBACK_BUTTON_DEFAULT_TEXT}
      href={getSurveyFeedbackURL({
        formUrl,
        kibanaVersion,
        isCloudEnv,
        isServerlessEnv,
        sanitizedPath,
      })}
      size="s"
      iconType={defaultButton ? undefined : 'popout'}
      iconSide="right"
      target="_blank"
      onClickCapture={onClickCapture}
      data-test-subj={dts}
      color="primary"
    >
      {surveyButtonText}
    </EuiButtonEmpty>
  );
};
