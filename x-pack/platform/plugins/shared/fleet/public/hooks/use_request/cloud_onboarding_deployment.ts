/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROOT } from '../../../common';
import { CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES } from '../../../common/constants';
import type {
  CreateCloudOnboardingDeploymentRequest,
  CreateCloudOnboardingDeploymentResponse,
  DeleteCloudOnboardingDeploymentResponse,
  GetCloudOnboardingDeploymentResponse,
  GetCloudOnboardingDeploymentsRequest,
  GetCloudOnboardingDeploymentsResponse,
  GetCloudOnboardingDeploymentCountsRequest,
  GetCloudOnboardingDeploymentCountsResponse,
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

export const sendGetCloudOnboardingDeploymentCounts = (
  query?: GetCloudOnboardingDeploymentCountsRequest['query']
) => {
  return sendRequestForRq<GetCloudOnboardingDeploymentCountsResponse>({
    path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.COUNTS_PATTERN,
    method: 'get',
    version: API_VERSIONS.internal.v1,
    query,
  });
};

// Both queries share the key prefix, so invalidating it (e.g. after a delete) refreshes both.
const QUERY_KEY = 'cloud_onboarding_deployments';

/** The number of deployments that cover each package, by package name. */
export const useGetCloudOnboardingDeploymentCountsQuery = (
  query?: GetCloudOnboardingDeploymentCountsRequest['query'],
  options: { enabled?: boolean } = {}
) => {
  return useQuery<GetCloudOnboardingDeploymentCountsResponse, RequestError>({
    queryKey: [QUERY_KEY, 'counts', query],
    queryFn: () => sendGetCloudOnboardingDeploymentCounts(query),
    enabled: options.enabled,
  });
};

/** One page of deployments, enriched with their policies and agents. */
export const useGetCloudOnboardingDeploymentsQuery = (
  query: GetCloudOnboardingDeploymentsRequest['query'],
  options: { enabled?: boolean } = {}
) => {
  return useQuery<GetCloudOnboardingDeploymentsResponse, RequestError>({
    queryKey: [QUERY_KEY, 'list', query],
    queryFn: () => sendGetCloudOnboardingDeployments(query),
    enabled: options.enabled,
    // A page is enriched with policies and agents: not worth refetching on every tab focus.
    refetchOnWindowFocus: false,
    // Keeps the current page on screen while the next one loads.
    keepPreviousData: true,
  });
};
