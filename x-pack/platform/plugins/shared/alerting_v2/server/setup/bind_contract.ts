/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Scope, Setup, Start } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import { AlertEventsClient } from '../lib/alert_events_client';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import type {
  AlertingServerSetup,
  AlertingServerStart,
  RulesClientApi,
  ActionPolicyClientApi,
  AlertEventsClientApi,
} from '../types';

export function bindContract({ bind }: ContainerModuleLoadOptions) {
  bind(Setup).toDynamicValue(({ get }) => {
    const registry = get(ArtifactTypeRegistry);
    const contract: AlertingServerSetup = {
      registerArtifactType: (definition) => {
        registry.register(definition);
      },
    };
    return contract;
  });

  bind(Start).toDynamicValue(({ get }) => {
    const buildScope = (request: KibanaRequest, spaceId?: string) => {
      const scope = get(Scope);
      scope.expose(Request).toConstantValue(request);
      if (spaceId) {
        scope.expose(RequestSpaceIdToken).toConstantValue(spaceId);
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
      async getAlertEventsClientWithRequest(request: KibanaRequest): Promise<AlertEventsClientApi> {
        return buildScope(request).get(AlertEventsClient);
      },
    };
    return contract;
  });
}
