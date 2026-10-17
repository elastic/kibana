/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import type {
  CreateIacCallbackRequest,
  CreateIacCallbackResponse,
  DeleteIacCallbackResponse,
  GetIacCallbackAvailabilityResponse,
  GetIacCallbackResponse,
} from '../../../common/types/rest_spec/iac_callback';
import { API_VERSIONS, IAC_PROVISIONER_API_ROUTES } from '../../../common/constants';

import { sendRequest, sendRequestForRq } from './use_request';

export const IAC_CALLBACK_AVAILABILITY_QUERY_KEY = ['iac-callback-availability'];

/** Whether a launched stack could report back to this Kibana: its public URL must be set and https. */
export function useGetIacCallbackAvailabilityQuery({ enabled }: { enabled: boolean }) {
  return useQuery(
    IAC_CALLBACK_AVAILABILITY_QUERY_KEY,
    () =>
      sendRequestForRq<GetIacCallbackAvailabilityResponse>({
        method: 'get',
        path: IAC_PROVISIONER_API_ROUTES.CALLBACK_AVAILABILITY_PATTERN,
        version: API_VERSIONS.internal.v1,
      }),
    { enabled, retry: false, staleTime: 60_000 }
  );
}

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
