/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT } from '../../../common';
import type {
  CreateCloudOnboardingDeploymentRequest,
  CreateCloudOnboardingDeploymentResponse,
  GetCloudOnboardingDeploymentResponse,
  GetCloudOnboardingDeploymentsRequest,
  GetCloudOnboardingDeploymentsResponse,
  UpdateCloudOnboardingDeploymentRequest,
  UpdateCloudOnboardingDeploymentResponse,
} from '../../../common/types/rest_spec/cloud_onboarding_deployment';

import { sendRequestForRq } from './use_request';
import type { RequestError } from './use_request';

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

export const sendGetCloudOnboardingDeployments = (
  query?: GetCloudOnboardingDeploymentsRequest['query']
) => {
  return sendRequestForRq<GetCloudOnboardingDeploymentsResponse>({
    path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT,
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
};

export const useGetCloudOnboardingDeploymentsQuery = (
  query?: GetCloudOnboardingDeploymentsRequest['query'],
  options: { enabled?: boolean } = {}
) => {
  return useQuery<GetCloudOnboardingDeploymentsResponse, RequestError>({
    queryKey: ['cloud_onboarding_deployments', query],
    queryFn: () => sendGetCloudOnboardingDeployments(query),
    enabled: options.enabled,
  });
};
