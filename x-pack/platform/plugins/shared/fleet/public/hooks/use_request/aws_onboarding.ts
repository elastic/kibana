/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsOnboardingCredentialsPublic,
  GetAwsOnboardingBootstrapLaunchResponse,
  GetAwsOnboardingBootstrapTemplateResponse,
  GetAwsOnboardingStackResponse,
  PutAwsOnboardingCredentialsRequest,
  AwsOnboardingVerifyResponse,
  AwsOnboardingManagementMode,
} from '../../../common/types/rest_spec/aws_onboarding';
import { API_VERSIONS, AWS_ONBOARDING_API_ROUTES } from '../../../common/constants';

import { sendRequest } from './use_request';

export function sendGetAwsOnboardingCredentials() {
  return sendRequest<AwsOnboardingCredentialsPublic>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
    version: API_VERSIONS.internal.v1,
  });
}

/** The secret travels once, in this request body; the server stores it encrypted and never returns it. */
export function sendPutAwsOnboardingCredentials(body: PutAwsOnboardingCredentialsRequest) {
  return sendRequest<AwsOnboardingCredentialsPublic>({
    method: 'put',
    path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
    version: API_VERSIONS.internal.v1,
    body,
  });
}

export function sendGetAwsOnboardingStack(stackId: string) {
  return sendRequest<GetAwsOnboardingStackResponse>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.STACK_INFO_PATTERN.replace(
      '{stackId}',
      encodeURIComponent(stackId)
    ),
    version: API_VERSIONS.internal.v1,
  });
}

export function sendGetAwsOnboardingBootstrapLaunch(
  mode: AwsOnboardingManagementMode,
  region?: string
) {
  return sendRequest<GetAwsOnboardingBootstrapLaunchResponse>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.BOOTSTRAP_LAUNCH_PATTERN,
    version: API_VERSIONS.internal.v1,
    query: { mode, ...(region ? { region } : {}) },
  });
}

export function sendGetAwsOnboardingBootstrapTemplate(mode: AwsOnboardingManagementMode) {
  return sendRequest<GetAwsOnboardingBootstrapTemplateResponse>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.BOOTSTRAP_TEMPLATE_PATTERN,
    version: API_VERSIONS.internal.v1,
    query: { mode },
  });
}

export function sendGetAwsOnboardingVerify() {
  return sendRequest<AwsOnboardingVerifyResponse>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.VERIFY_PATTERN,
    version: API_VERSIONS.internal.v1,
  });
}
