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

const LIST_PAGE_SIZE = 100;
// Stops a runaway loop: 2000 sessions in one space is far beyond what the list is meant for.
const LIST_MAX_PAGES = 20;

/** Every deployment matching the query, fetched page by page. */
export const sendGetAllCloudOnboardingDeployments = async (
  query?: Omit<NonNullable<GetCloudOnboardingDeploymentsRequest['query']>, 'page' | 'perPage'>
) => {
  const items: GetCloudOnboardingDeploymentsResponse['items'] = [];
  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    const response = await sendGetCloudOnboardingDeployments({
      ...query,
      page,
      perPage: LIST_PAGE_SIZE,
    });
    items.push(...response.items);
    if (response.items.length === 0 || items.length >= response.total) break;
  }
  return items;
};

export const useGetAllCloudOnboardingDeploymentsQuery = (
  query?: Omit<NonNullable<GetCloudOnboardingDeploymentsRequest['query']>, 'page' | 'perPage'>,
  options: { enabled?: boolean } = {}
) => {
  return useQuery<GetCloudOnboardingDeploymentsResponse['items'], RequestError>({
    queryKey: ['cloud_onboarding_deployments', query],
    queryFn: () => sendGetAllCloudOnboardingDeployments(query),
    enabled: options.enabled,
  });
};
