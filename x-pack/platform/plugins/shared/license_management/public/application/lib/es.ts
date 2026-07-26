/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../../common/constants';

export interface PutLicenseResponse {
  error?: { reason: string };
  acknowledged?: boolean;
  license_status?: string;
  acknowledge?: Record<string, string[]>;
}

export interface StartBasicResponse {
  acknowledged: boolean;
  basic_was_started: boolean;
  error_message: string;
  acknowledge: Record<string, string[]>;
}

export interface StartTrialResponse {
  trial_was_started: boolean;
  error_message: string;
}

export interface GetPermissionsResponse {
  hasPermission: boolean;
}

export function putLicense(
  http: HttpSetup,
  license: string,
  acknowledge: boolean
): Promise<PutLicenseResponse> {
  return http.put<PutLicenseResponse>(API_BASE_PATH, {
    query: {
      acknowledge: acknowledge ? 'true' : '',
    },
    body: license,
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function startBasic(http: HttpSetup, acknowledge: boolean): Promise<StartBasicResponse> {
  return http.post<StartBasicResponse>(`${API_BASE_PATH}/start_basic`, {
    query: {
      acknowledge: acknowledge ? 'true' : '',
    },
    headers: {
      contentType: 'application/json',
    },
    body: null,
    cache: 'no-cache',
  });
}

export function startTrial(http: HttpSetup): Promise<StartTrialResponse> {
  return http.post<StartTrialResponse>(`${API_BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function canStartTrial(http: HttpSetup): Promise<boolean> {
  return http.get<boolean>(`${API_BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function getPermissions(http: HttpSetup): Promise<GetPermissionsResponse> {
  return http.post<GetPermissionsResponse>(`${API_BASE_PATH}/permissions`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}
