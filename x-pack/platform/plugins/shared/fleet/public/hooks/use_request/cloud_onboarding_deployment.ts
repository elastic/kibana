/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT } from '../../../common';
import { CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES } from '../../../common/constants';
import type {
  CreateCloudOnboardingDeploymentRequest,
  CreateCloudOnboardingDeploymentResponse,
  GetAwsStackCallbackResponse,
  GetCloudOnboardingDeploymentResponse,
  StartAwsStackCallbackRequest,
  StartAwsStackCallbackResponse,
  UpdateCloudOnboardingDeploymentRequest,
  UpdateCloudOnboardingDeploymentResponse,
} from '../../../common/types/rest_spec/cloud_onboarding_deployment';

import { sendRequestForRq } from './use_request';

export const sendCreateCloudOnboardingDeployment = (
  body: CreateCloudOnboardingDeploymentRequest['body']
) => {
  return sendRequestForRq<CreateCloudOnboardingDeploymentResponse>({
    path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT,
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
};

export const sendGetCloudOnboardingDeployment = (id: string) => {
  return sendRequestForRq<GetCloudOnboardingDeploymentResponse>({
    path: `${CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT}/${id}`,
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendUpdateCloudOnboardingDeployment = (
  id: string,
  body: UpdateCloudOnboardingDeploymentRequest['body']
) => {
  return sendRequestForRq<UpdateCloudOnboardingDeploymentResponse>({
    path: `${CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT}/${id}`,
    method: 'put',
    version: API_VERSIONS.public.v1,
    body,
  });
};

const awsStackCallbackPath = (id: string) =>
  CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.AWS_STACK_CALLBACK_PATTERN.replace(
    '{id}',
    encodeURIComponent(id)
  );

export const sendStartAwsStackCallback = (
  id: string,
  body: StartAwsStackCallbackRequest['body']
) => {
  return sendRequestForRq<StartAwsStackCallbackResponse>({
    path: awsStackCallbackPath(id),
    method: 'post',
    version: API_VERSIONS.internal.v1,
    body,
  });
};

export const sendGetAwsStackCallback = (id: string) => {
  return sendRequestForRq<GetAwsStackCallbackResponse>({
    path: awsStackCallbackPath(id),
    method: 'get',
    version: API_VERSIONS.internal.v1,
  });
};
