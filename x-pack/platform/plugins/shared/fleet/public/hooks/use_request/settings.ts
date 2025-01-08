/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsRoutesService } from '../../services';
import type {
  PutSettingsResponse,
  PutSettingsRequest,
  GetSettingsResponse,
  GetEnrollmentSettingsRequest,
  GetEnrollmentSettingsResponse,
  GetSpaceSettingsResponse,
} from '../../types';

import { API_VERSIONS } from '../../../common/constants';

import type { RequestError } from './use_request';
import { sendRequest, sendRequestForRq, useRequest } from './use_request';

export function useGetSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery<GetSettingsResponse, RequestError>({
    queryKey: ['settings'],
    enabled: options?.enabled,
    queryFn: () =>
      sendRequestForRq<GetSettingsResponse>({
        method: 'get',
        path: settingsRoutesService.getInfoPath(),
        version: API_VERSIONS.public.v1,
      }),
  });
}

export function useGetSettings() {
  return useRequest<GetSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getInfoPath(),
    version: API_VERSIONS.public.v1,
  });
}

export function useGetSpaceSettings({ enabled }: { enabled?: boolean }) {
  return useQuery<GetSpaceSettingsResponse, RequestError>({
    queryKey: ['space_settings'],
    enabled,
    queryFn: () =>
      sendRequestForRq<GetSpaceSettingsResponse>({
        method: 'get',
        path: settingsRoutesService.getSpaceInfoPath(),
        version: API_VERSIONS.public.v1,
      }),
  });
}

export function sendGetSettings() {
  return sendRequest<GetSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getInfoPath(),
    version: API_VERSIONS.public.v1,
  });
}

export function usePutSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendPutSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
    },
  });
}

export function sendPutSettings(body: PutSettingsRequest['body']) {
  return sendRequest<PutSettingsResponse>({
    method: 'put',
    path: settingsRoutesService.getUpdatePath(),
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function useGetEnrollmentSettings(query?: GetEnrollmentSettingsRequest['query']) {
  return useRequest<GetEnrollmentSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getEnrollmentInfoPath(),
    version: API_VERSIONS.public.v1,
    query,
  });
}

export function sendGetEnrollmentSettings(query?: GetEnrollmentSettingsRequest['query']) {
  return sendRequest<GetEnrollmentSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getEnrollmentInfoPath(),
    version: API_VERSIONS.public.v1,
    query,
  });
}
