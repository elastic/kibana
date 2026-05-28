/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ActionPolicyClient } from '../lib/action_policy_client/action_policy_client';

export type GetScopedActionPolicyClient = (request: KibanaRequest) => ActionPolicyClient;

/**
 * Builds a factory that produces a request-scoped ActionPolicyClient by forking
 * the inversify container and binding the incoming request before resolving.
 *
 * Same pattern as buildScopedRulesClientFactory — Agent Builder tool handlers
 * execute outside the core HTTP route pipeline so we replicate the per-request
 * container scope manually.
 */
export function buildScopedActionPolicyClientFactory(
  getInjection: () => CoreDiServiceStart
): GetScopedActionPolicyClient {
  return (request: KibanaRequest): ActionPolicyClient => {
    const scope = getInjection().fork();
    scope.bind(Request).toConstantValue(request);
    scope.bind(Global).toConstantValue(Request);
    return scope.get(ActionPolicyClient);
  };
}
