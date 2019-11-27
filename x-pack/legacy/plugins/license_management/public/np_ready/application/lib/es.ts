/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

export function putLicense(http: HttpSetup, license: any, acknowledge: any) {
  return http.put('/api/license', {
    query: {
      acknowledge: acknowledge ? 'true' : '',
    },
    body: JSON.stringify(license),
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function startBasic(http: HttpSetup, acknowledge: any) {
  return http.post('/api/license/start_basic', {
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
  return http.post('/api/license/start_trial', {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function canStartTrial(http: HttpSetup) {
  return http.get('/api/license/start_trial', {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function getPermissions(http: HttpSetup) {
  return http.post('/api/license/permissions', {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}
