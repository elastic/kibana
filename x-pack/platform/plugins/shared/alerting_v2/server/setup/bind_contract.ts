/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Setup, Start } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { PreQueryFilterRegistryToken } from '../lib/rule_executor/pre_query_filter_registry';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import type {
  AlertingServerSetup,
  AlertingServerStart,
  RulesClientApi,
  ActionPolicyClientApi,
} from '../types';

export function bindContract({ bind }: ContainerModuleLoadOptions) {
  bind(Setup).toDynamicValue(({ get }) => {
    const registry = get(PreQueryFilterRegistryToken);

    const setupContract: AlertingServerSetup = {
      registerPreQueryFilterProvider(name, provider) {
        registry.register(name, provider);
      },
    };
    return setupContract;
  });

  bind(Start).toDynamicValue(({ get }) => {
    const injection = get(CoreStart('injection'));

    const buildScope = (request: KibanaRequest, spaceId?: string) => {
      const scope = injection.fork();
      scope.bind(Request).toConstantValue(request);
      scope.bind(Global).toConstantValue(Request);
      if (spaceId) {
        scope.bind(RequestSpaceIdToken).toConstantValue(spaceId);
        scope.bind(Global).toConstantValue(RequestSpaceIdToken);
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
      async getActionPolicyClientWithRequest(
        request: KibanaRequest
      ): Promise<ActionPolicyClientApi> {
        return buildScope(request).get(ActionPolicyClient);
      },
      async getActionPolicyClientWithRequestInSpace(
        request: KibanaRequest,
        spaceId: string
      ): Promise<ActionPolicyClientApi> {
        return buildScope(request, spaceId).get(ActionPolicyClient);
      },
    };
    return contract;
  });
}
