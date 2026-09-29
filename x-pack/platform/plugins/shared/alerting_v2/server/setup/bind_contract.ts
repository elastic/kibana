/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { PluginStart, Setup, Start } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import { AlertEventsClient } from '../lib/alert_events_client';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import {
  RuleSavedObjectsClientToken,
  RulesSavedObjectServiceInternalToken,
} from '../lib/services/rules_saved_object_service/tokens';
import { createInternalUserRequest } from '../lib/internal_user_request';
import { createInternalRulesClient } from '../lib/internal_rules_client';
import { spaceIdToNamespace } from '../lib/space_id_to_namespace';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  AlertingServerSetup,
  AlertingServerStart,
  AlertingServerStartDependencies,
  RulesClientApi,
  InternalRulesClientApi,
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
    const injection = get(CoreStart('injection'));

    const buildScope = (request: KibanaRequest, spaceId?: SpaceId) => {
      const scope = injection.fork();
      scope.bind(Request).toConstantValue(request);
      scope.bind(Global).toConstantValue(Request);
      if (spaceId) {
        scope.bind(RequestSpaceIdToken).toConstantValue(spaceId);
        scope.bind(Global).toConstantValue(RequestSpaceIdToken);
      }
      return scope;
    };

    // A credential-less request plus an internal-user rules SO client bound to the
    // space, so the regular rules client code path runs without a user.
    const savedObjects = get(CoreStart('savedObjects'));
    const spaces = get(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'));
    const internalClient = savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
    const buildInternalScope = (spaceId: SpaceId) => {
      const scope = buildScope(createInternalUserRequest(spaceId), spaceId);
      const namespace = spaceIdToNamespace(spaces, spaceId);
      scope
        .bind(RuleSavedObjectsClientToken)
        .toConstantValue(
          namespace ? internalClient.asScopedToNamespace(namespace) : internalClient
        );
      return scope;
    };
    const rulesSavedObjectServiceInternal = get(RulesSavedObjectServiceInternalToken);

    const contract: AlertingServerStart = {
      async getRulesClientWithRequest(request: KibanaRequest): Promise<RulesClientApi> {
        return buildScope(request).get(RulesClient);
      },
      async getRulesClientWithRequestInSpace(
        request: KibanaRequest,
        spaceId: SpaceId
      ): Promise<RulesClientApi> {
        return buildScope(request, spaceId).get(RulesClient);
      },
      async getInternalRulesClient(): Promise<InternalRulesClientApi> {
        return createInternalRulesClient({
          rulesSavedObjectService: rulesSavedObjectServiceInternal,
          getRulesClientInSpace: (spaceId) => buildInternalScope(spaceId).get(RulesClient),
        });
      },
      async getActionPolicyClientWithRequest(
        request: KibanaRequest
      ): Promise<ActionPolicyClientApi> {
        return buildScope(request).get(ActionPolicyClient);
      },
      async getActionPolicyClientWithRequestInSpace(
        request: KibanaRequest,
        spaceId: SpaceId
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
