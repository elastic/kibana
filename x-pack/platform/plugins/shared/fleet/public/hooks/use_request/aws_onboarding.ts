/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsOnboardingCredentialsPublic,
  GetAwsOnboardingBootstrapTemplateResponse,
  CreateAwsOnboardingStackRequest,
  CreateAwsOnboardingStackResponse,
  GetAwsOnboardingStackResponse,
  PutAwsOnboardingCredentialsRequest,
  UpdateAwsOnboardingStackRequest,
  UpdateAwsOnboardingStackResponse,
  DeleteAwsOnboardingCredentialsRequestQuery,
  DeleteAwsOnboardingCredentialsResponse,
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

export function sendDeleteAwsOnboardingCredentials(
  query: DeleteAwsOnboardingCredentialsRequestQuery = {}
) {
  return sendRequest<DeleteAwsOnboardingCredentialsResponse>({
    method: 'delete',
    path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
    version: API_VERSIONS.internal.v1,
    query: { force: query.force ?? false },
  });
}

export function sendCreateAwsOnboardingStack(body: CreateAwsOnboardingStackRequest) {
  return sendRequest<CreateAwsOnboardingStackResponse>({
    method: 'post',
    path: AWS_ONBOARDING_API_ROUTES.STACKS_PATTERN,
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

export function sendUpdateAwsOnboardingStack(
  cloudConnectorId: string,
  body: UpdateAwsOnboardingStackRequest
) {
  return sendRequest<UpdateAwsOnboardingStackResponse>({
    method: 'post',
    path: AWS_ONBOARDING_API_ROUTES.STACK_UPDATE_PATTERN.replace(
      '{cloudConnectorId}',
      cloudConnectorId
    ),
    version: API_VERSIONS.internal.v1,
    body,
  });
}

export function sendGetAwsOnboardingBootstrapTemplate() {
  return sendRequest<GetAwsOnboardingBootstrapTemplateResponse>({
    method: 'get',
    path: AWS_ONBOARDING_API_ROUTES.BOOTSTRAP_TEMPLATE_PATTERN,
    version: API_VERSIONS.internal.v1,
  });
}
