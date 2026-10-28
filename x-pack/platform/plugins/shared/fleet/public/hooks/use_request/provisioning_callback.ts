/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import type {
  CreateProvisioningCallbackRequest,
  CreateProvisioningCallbackResponse,
  DeleteProvisioningCallbackResponse,
  GetProvisioningCallbackAvailabilityResponse,
  GetProvisioningCallbackResponse,
} from '../../../common/types/rest_spec/provisioning_callback';
import { API_VERSIONS, IAC_PROVISIONER_API_ROUTES } from '../../../common/constants';

import { sendRequest, sendRequestForRq } from './use_request';

export const PROVISIONING_CALLBACK_AVAILABILITY_QUERY_KEY = ['provisioning-callback-availability'];

/** Whether a launched stack could report back to this Kibana: its public URL must be set and https. */
export function useGetProvisioningCallbackAvailabilityQuery({ enabled }: { enabled: boolean }) {
  return useQuery(
    PROVISIONING_CALLBACK_AVAILABILITY_QUERY_KEY,
    () =>
      sendRequestForRq<GetProvisioningCallbackAvailabilityResponse>({
        method: 'get',
        path: IAC_PROVISIONER_API_ROUTES.CALLBACK_AVAILABILITY_PATTERN,
        version: API_VERSIONS.internal.v1,
      }),
    { enabled, retry: false, staleTime: 60_000 }
  );
}

const callbackPath = (id: string) =>
  IAC_PROVISIONER_API_ROUTES.CALLBACK_INFO_PATTERN.replace('{callbackId}', encodeURIComponent(id));

export function sendCreateProvisioningCallback(body: CreateProvisioningCallbackRequest['body']) {
  return sendRequest<CreateProvisioningCallbackResponse>({
    method: 'post',
    path: IAC_PROVISIONER_API_ROUTES.CALLBACK_CREATE_PATTERN,
    version: API_VERSIONS.internal.v1,
    body,
  });
}

export function sendGetProvisioningCallback(id: string) {
  return sendRequest<GetProvisioningCallbackResponse>({
    method: 'get',
    path: callbackPath(id),
    version: API_VERSIONS.internal.v1,
  });
}

export function sendDeleteProvisioningCallback(id: string) {
  return sendRequest<DeleteProvisioningCallbackResponse>({
    method: 'delete',
    path: callbackPath(id),
    version: API_VERSIONS.internal.v1,
  });
}
