/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

const BASE_PATH = '/api/license';

export function putLicense(http: HttpSetup, license: string, acknowledge: boolean) {
  return http.put(BASE_PATH, {
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

export function startBasic(http: HttpSetup, acknowledge: boolean) {
  return http.post(`${BASE_PATH}/start_basic`, {
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

export function startTrial(http: HttpSetup) {
  return http.post(`${BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function canStartTrial(http: HttpSetup) {
  return http.get(`${BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function getPermissions(http: HttpSetup) {
  return http.post(`${BASE_PATH}/permissions`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}
