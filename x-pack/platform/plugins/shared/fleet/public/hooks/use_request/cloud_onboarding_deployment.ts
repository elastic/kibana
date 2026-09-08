/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT } from '../../../common';
import type {
  CreateCloudOnboardingDeploymentRequest,
  CreateCloudOnboardingDeploymentResponse,
  GetCloudOnboardingDeploymentResponse,
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
