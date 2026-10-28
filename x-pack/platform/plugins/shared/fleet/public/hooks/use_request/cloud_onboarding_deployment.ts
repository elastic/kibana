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
  DeleteCloudOnboardingDeploymentResponse,
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

export const sendDeleteCloudOnboardingDeployment = (id: string) => {
  return sendRequestForRq<DeleteCloudOnboardingDeploymentResponse>({
    path: `${CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT}/${id}`,
    method: 'delete',
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
export const MAX_CLOUD_ONBOARDING_DEPLOYMENTS = 2000;

export interface AllCloudOnboardingDeployments {
  items: GetCloudOnboardingDeploymentsResponse['items'];
  /** How many deployments match the query in total. */
  total: number;
  /** True when `items` is a subset of `total` because the page cap was reached. */
  isTruncated: boolean;
}

/** Every deployment matching the query, fetched page by page, up to a cap. */
export const sendGetAllCloudOnboardingDeployments = async (
  query?: Omit<NonNullable<GetCloudOnboardingDeploymentsRequest['query']>, 'page' | 'perPage'>
): Promise<AllCloudOnboardingDeployments> => {
  const items: GetCloudOnboardingDeploymentsResponse['items'] = [];
  let total = 0;
  for (let page = 1; page <= MAX_CLOUD_ONBOARDING_DEPLOYMENTS / LIST_PAGE_SIZE; page++) {
    const response = await sendGetCloudOnboardingDeployments({
      ...query,
      page,
      perPage: LIST_PAGE_SIZE,
    });
    items.push(...response.items);
    total = response.total;
    if (response.items.length === 0 || items.length >= total) break;
  }
  return { items, total, isTruncated: items.length < total };
};

export const useGetAllCloudOnboardingDeploymentsQuery = (
  query?: Omit<NonNullable<GetCloudOnboardingDeploymentsRequest['query']>, 'page' | 'perPage'>,
  options: { enabled?: boolean } = {}
) => {
  return useQuery<AllCloudOnboardingDeployments, RequestError>({
    queryKey: ['cloud_onboarding_deployments', query],
    queryFn: () => sendGetAllCloudOnboardingDeployments(query),
    enabled: options.enabled,
    // A refetch reads every page with its policies and agents: not worth it on every tab focus.
    refetchOnWindowFocus: false,
  });
};
