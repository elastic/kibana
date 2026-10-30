/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Pass this request to ML shared services providers to run them as the Kibana internal user, skipping ML capability checks.
 */
export const ML_INTERNAL_USER_REQUEST: KibanaRequest = kibanaRequestFactory({
  headers: {},
  path: '/',
  spaceId: DEFAULT_SPACE_ID,
});

export const isMlInternalUserRequest = (request: KibanaRequest): boolean =>
  request === ML_INTERNAL_USER_REQUEST;
