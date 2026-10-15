/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateIacCallbackRequest,
  CreateIacCallbackResponse,
  DeleteIacCallbackResponse,
  GetIacCallbackResponse,
} from '../../../common/types/rest_spec/iac_callback';
import { API_VERSIONS, IAC_PROVISIONER_API_ROUTES } from '../../../common/constants';

import { sendRequest } from './use_request';

const callbackPath = (id: string) =>
  IAC_PROVISIONER_API_ROUTES.CALLBACK_INFO_PATTERN.replace('{callbackId}', encodeURIComponent(id));

export function sendCreateIacCallback(body: CreateIacCallbackRequest['body']) {
  return sendRequest<CreateIacCallbackResponse>({
    method: 'post',
    path: IAC_PROVISIONER_API_ROUTES.CALLBACK_CREATE_PATTERN,
    version: API_VERSIONS.internal.v1,
    body,
  });
}

export function sendGetIacCallback(id: string) {
  return sendRequest<GetIacCallbackResponse>({
    method: 'get',
    path: callbackPath(id),
    version: API_VERSIONS.internal.v1,
  });
}

export function sendDeleteIacCallback(id: string) {
  return sendRequest<DeleteIacCallbackResponse>({
    method: 'delete',
    path: callbackPath(id),
    version: API_VERSIONS.internal.v1,
  });
}
