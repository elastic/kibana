/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnPostAuthInterceptorDeps } from './on_post_auth_interceptor';
import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import type { OnRequestInterceptorDeps } from './on_request_interceptor';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

export type InterceptorDeps = OnRequestInterceptorDeps & OnPostAuthInterceptorDeps;

export function initSpacesRequestInterceptors(deps: InterceptorDeps) {
  initSpacesOnRequestInterceptor(deps);
  initSpacesOnPostAuthRequestInterceptor(deps);
}
