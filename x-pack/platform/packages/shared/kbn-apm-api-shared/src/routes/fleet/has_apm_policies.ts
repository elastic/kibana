/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export interface HasApmPoliciesResponse {
  hasApmPolicies: boolean;
}

export const hasApmPoliciesRoute = defineRoute<HasApmPoliciesResponse>()({
  endpoint: 'GET /internal/apm/fleet/has_apm_policies',
});
