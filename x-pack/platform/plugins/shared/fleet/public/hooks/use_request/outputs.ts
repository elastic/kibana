/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type {
  GetOutputHealthResponse,
  GetRemoteSyncedIntegrationsStatusResponse,
} from '../../../common/types';

import { outputRoutesService } from '../../services';
import type {
  PutOutputRequest,
  GetOutputsResponse,
  PostOutputRequest,
  PostLogstashApiKeyResponse,
} from '../../types';

import { API_VERSIONS } from '../../../common/constants';

import { sendRequest, sendRequestForRq, useRequest } from './use_request';

export function useGetOutputs() {
  return useRequest<GetOutputsResponse>({
    method: 'get',
    path: outputRoutesService.getListPath(),
    version: API_VERSIONS.public.v1,
  });
}

export function useDefaultOutput() {
  const outputsRequest = useGetOutputs();
  const output = outputsRequest.data?.items.find((o) => o.is_default);

  return { output, refresh: outputsRequest.resendRequest };
}

export function sendGetOneOutput(outputId: string) {
  return sendRequest({
    method: 'get',
    path: outputRoutesService.getInfoPath(outputId),
    version: API_VERSIONS.public.v1,
  });
}

export function sendPutOutput(outputId: string, body: PutOutputRequest['body']) {
  return sendRequest({
    method: 'put',
    path: outputRoutesService.getUpdatePath(outputId),
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function sendPostLogstashApiKeys() {
  return sendRequest<PostLogstashApiKeyResponse>({
    method: 'post',
    path: outputRoutesService.getCreateLogstashApiKeyPath(),
    version: API_VERSIONS.public.v1,
  });
}

export function sendPostOutput(body: PostOutputRequest['body']) {
  return sendRequest({
    method: 'post',
    path: outputRoutesService.getCreatePath(),
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function sendDeleteOutput(outputId: string) {
  return sendRequest({
    method: 'delete',
    path: outputRoutesService.getDeletePath(outputId),
    version: API_VERSIONS.public.v1,
  });
}

export function sendGetOutputHealth(outputId: string) {
  return sendRequest<GetOutputHealthResponse>({
    method: 'get',
    path: outputRoutesService.getOutputHealthPath(outputId),
    version: API_VERSIONS.public.v1,
  });
}

export function sendGetRemoteSyncedIntegrationsStatus(outputId: string) {
  return sendRequestForRq<GetRemoteSyncedIntegrationsStatusResponse>({
    method: 'get',
    path: outputRoutesService.getRemoteSyncedIntegrationsStatusPath(outputId),
    version: API_VERSIONS.public.v1,
  });
}

const SYNC_STATUS_REFETCH_INTERVAL = 10000;

export function useGetRemoteSyncedIntegrationsStatusQuery(
  outputId: string,
  options: Partial<{ enabled: boolean }> = {}
) {
  return useQuery(
    [`remote_synced_integrations_status_${outputId}`],
    () => sendGetRemoteSyncedIntegrationsStatus(outputId),
    {
      enabled: options.enabled,
      refetchInterval: SYNC_STATUS_REFETCH_INTERVAL,
      retry: false,
    }
  );
}
