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
import { RulesClient } from '../lib/rules_client';

export type GetScopedRulesClient = (request: KibanaRequest) => RulesClient;

/**
 * Builds a factory that produces a request-scoped RulesClient by forking the
 * inversify container and binding the incoming request before resolving.
 *
 * Agent Builder tool handlers receive a real KibanaRequest but execute outside
 * the core HTTP route pipeline, so the automatic per-request container scope
 * (set up by core-di's loadHttp module) is never created for them. This factory
 * replicates that setup manually — the same pattern used in createTaskRunnerFactory.
 *
 * If other inversify-based plugins need to expose Agent Builder tools, this
 * pattern will repeat. At that point it is worth extracting a generic utility
 * into @kbn/core-di (e.g. createRequestScopedFactory(getInjection, token)).
 */
export function buildScopedRulesClientFactory(
  getInjection: () => CoreDiServiceStart
): GetScopedRulesClient {
  return (request: KibanaRequest): RulesClient => {
    const scope = getInjection().fork();
    scope.bind(Request).toConstantValue(request);
    scope.bind(Global).toConstantValue(Request);
    return scope.get(RulesClient);
  };
}
