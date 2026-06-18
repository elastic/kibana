/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

export function createInternalKibanaRequest(): KibanaRequest {
  return kibanaRequestFactory({
    headers: { 'x-elastic-internal-origin': 'kibana' },
    path: '/',
  });
}
