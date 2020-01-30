/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throwIfNotOk } from '../../hooks/api/api';
import { MeApiResponse } from './recent_timelines';

export const getMeApiUrl = (getBasePath: () => string): string =>
  `${getBasePath()}/internal/security/me`;

export const fetchUsername = async (meApiUrl: string) => {
  const response = await fetch(meApiUrl, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
    },
  });

  await throwIfNotOk(response);
  const apiResponse: MeApiResponse = await response.json();

  return apiResponse.username;
};
