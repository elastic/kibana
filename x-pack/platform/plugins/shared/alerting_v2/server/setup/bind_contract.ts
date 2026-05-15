/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Start } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { RulesClient } from '../lib/rules_client';
import { RulesClientSpaceIdToken } from '../lib/rules_client/tokens';
import type { AlertingServerStart, RulesClientApi } from '../types';

export function bindContract({ bind }: ContainerModuleLoadOptions) {
  bind(Start).toDynamicValue(({ get }) => {
    const injection = get(CoreStart('injection'));

    const buildScope = (request: KibanaRequest, spaceId?: string) => {
      const scope = injection.fork();
      scope.bind(Request).toConstantValue(request);
      scope.bind(Global).toConstantValue(Request);
      if (spaceId) {
        scope.bind(RulesClientSpaceIdToken).toConstantValue(spaceId);
        scope.bind(Global).toConstantValue(RulesClientSpaceIdToken);
      }
      return scope;
    };

    const contract: AlertingServerStart = {
      async getRulesClientWithRequest(request: KibanaRequest): Promise<RulesClientApi> {
        return buildScope(request).get(RulesClient);
      },
      async getRulesClientWithRequestInSpace(
        request: KibanaRequest,
        spaceId: string
      ): Promise<RulesClientApi> {
        return buildScope(request, spaceId).get(RulesClient);
      },
    };
    return contract;
  });
}
