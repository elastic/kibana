/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import { throwIfNotOk } from '../../hooks/api/api';
import { MeApiResponse } from './recent_timelines';

export const fetchUsername = async () => {
  const response = await npStart.core.http.fetch<MeApiResponse>('/internal/security/me', {
    method: 'GET',
    credentials: 'same-origin',
    asResponse: true,
  });

  await throwIfNotOk(response.response);
  return response.body!.username;
};
