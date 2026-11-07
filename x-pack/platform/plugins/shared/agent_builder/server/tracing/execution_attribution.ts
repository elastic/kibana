/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes } from '@opentelemetry/api';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { toHashedId } from '@kbn/agent-builder-server/telemetry';
import type { TracingPrivacySettings } from './privacy_settings';

export const EXECUTION_ATTRIBUTION = {
  status: 'elastic.agent_builder.attribution.status',
  source: 'elastic.agent_builder.attribution.source',
  capturePoint: 'elastic.agent_builder.attribution.capture_point',
  callerType: 'elastic.agent_builder.caller.principal.type',
  callerId: 'elastic.agent_builder.caller.principal.id',
  callerHash: 'elastic.agent_builder.caller.principal.hash',
  callerName: 'elastic.agent_builder.caller.principal.name',
  apiKeyId: 'elastic.agent_builder.caller.api_key.id',
  apiKeyHash: 'elastic.agent_builder.caller.api_key.hash',
  actorId: 'elastic.agent_builder.initiating_actor.id',
  actorHash: 'elastic.agent_builder.initiating_actor.hash',
  actorName: 'elastic.agent_builder.initiating_actor.name',
  actorSource: 'elastic.agent_builder.initiating_actor.source',
  requestUserScopeId: 'elastic.agent_builder.request_user_scope.id',
  requestUserScopeHash: 'elastic.agent_builder.request_user_scope.hash',
  requestUserScopeName: 'elastic.agent_builder.request_user_scope.name',
  delegationStatus: 'elastic.agent_builder.delegation.status',
  downstreamCredentialStatus: 'elastic.agent_builder.downstream_credential.status',
} as const;

export interface ExecutionAttribution {
  attributes: Record<string, string>;
  initiatingActor?: { id?: string; username?: string };
}

/** Reads caller evidence from trusted authentication context without inferring tool credentials. */
export const getExecutionAttribution = ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
}): ExecutionAttribution => {
  const principal = security.authc.getPrincipal(request);
  const attributes: Record<string, string> = {
    [EXECUTION_ATTRIBUTION.status]: 'unavailable',
    [EXECUTION_ATTRIBUTION.source]: 'kibana_authc',
    [EXECUTION_ATTRIBUTION.capturePoint]: 'execution',
    [EXECUTION_ATTRIBUTION.delegationStatus]: 'unknown',
    [EXECUTION_ATTRIBUTION.downstreamCredentialStatus]: 'unknown',
  };
  let initiatingActor: ExecutionAttribution['initiatingActor'];

  if (principal) {
    attributes[EXECUTION_ATTRIBUTION.status] = 'partial';
    attributes[EXECUTION_ATTRIBUTION.callerType] = principal.type;
    switch (principal.type) {
      case 'user':
        attributes[EXECUTION_ATTRIBUTION.callerName] = principal.username;
        if (principal.userProfileId) {
          attributes[EXECUTION_ATTRIBUTION.callerId] = principal.userProfileId;
        }
        if (!request.isFakeRequest) {
          initiatingActor = { id: principal.userProfileId, username: principal.username };
          attributes[EXECUTION_ATTRIBUTION.actorSource] = 'kibana_authc';
        }
        break;
      case 'anonymous':
        attributes[EXECUTION_ATTRIBUTION.callerName] = principal.username;
        break;
      case 'api_key':
        attributes[EXECUTION_ATTRIBUTION.callerId] = principal.apiKeyId;
        attributes[EXECUTION_ATTRIBUTION.apiKeyId] = principal.apiKeyId;
        break;
      case 'service_account':
        attributes[EXECUTION_ATTRIBUTION.callerId] = principal.serviceAccountId;
        break;
    }
  }

  if (request.isFakeRequest) {
    const requestUser = security.authc.getCurrentUser(request);
    // Task user scope may name an API-key owner: the original authentication type is
    // not retained. Keep this context separate from both caller and initiating actor.
    if (
      requestUser &&
      requestUser.authentication_provider === undefined &&
      requestUser.authentication_type === undefined &&
      (requestUser.profile_uid || requestUser.username)
    ) {
      if (requestUser.profile_uid) {
        attributes[EXECUTION_ATTRIBUTION.requestUserScopeId] = requestUser.profile_uid;
      }
      if (requestUser.username) {
        attributes[EXECUTION_ATTRIBUTION.requestUserScopeName] = requestUser.username;
      }
      attributes[EXECUTION_ATTRIBUTION.status] = 'partial';
    }
  }

  if (initiatingActor?.id) {
    attributes[EXECUTION_ATTRIBUTION.actorId] = initiatingActor.id;
  }
  if (initiatingActor?.username) {
    attributes[EXECUTION_ATTRIBUTION.actorName] = initiatingActor.username;
  }
  return { attributes, ...(initiatingActor ? { initiatingActor } : {}) };
};

/** Exports explicit pseudonyms instead of raw attribution identifiers when privacy requires it. */
export const applyExecutionAttributionPrivacy = (
  attributes: Attributes,
  settings: TracingPrivacySettings
): Attributes => {
  const result = { ...attributes };
  if (!settings.includeRealIds || !settings.includeUserData) {
    for (const [id, hash] of [
      [EXECUTION_ATTRIBUTION.callerId, EXECUTION_ATTRIBUTION.callerHash],
      [EXECUTION_ATTRIBUTION.apiKeyId, EXECUTION_ATTRIBUTION.apiKeyHash],
      [EXECUTION_ATTRIBUTION.actorId, EXECUTION_ATTRIBUTION.actorHash],
      [EXECUTION_ATTRIBUTION.requestUserScopeId, EXECUTION_ATTRIBUTION.requestUserScopeHash],
    ]) {
      const value = result[id];
      if (typeof value === 'string') {
        result[hash] = toHashedId(value);
      }
      delete result[id];
    }
  }
  if (!settings.includeRealNames || !settings.includeUserData) {
    delete result[EXECUTION_ATTRIBUTION.callerName];
    delete result[EXECUTION_ATTRIBUTION.actorName];
    delete result[EXECUTION_ATTRIBUTION.requestUserScopeName];
  }
  return result;
};

/** Captures privacy-filtered caller evidence at the request boundary before scheduling a task. */
export const captureExecutionAttribution = ({
  request,
  security,
  settings,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  settings: TracingPrivacySettings;
}): Record<string, string> | undefined => {
  if (!settings.enabled) return undefined;
  const { attributes } = getExecutionAttribution({ request, security });
  const redacted = applyExecutionAttributionPrivacy(
    { ...attributes, [EXECUTION_ATTRIBUTION.capturePoint]: 'request' },
    settings
  );
  return Object.fromEntries(
    Object.entries(redacted).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
};

/** Restores only recognized server-captured attribution fields from an internal execution record. */
export const restoreExecutionAttribution = (
  snapshot: Readonly<Record<string, string>>
): ExecutionAttribution => {
  const attributes = Object.fromEntries(
    Object.values(EXECUTION_ATTRIBUTION).flatMap((key) =>
      typeof snapshot[key] === 'string' ? [[key, snapshot[key]]] : []
    )
  );
  const id = attributes[EXECUTION_ATTRIBUTION.actorId];
  const username = attributes[EXECUTION_ATTRIBUTION.actorName];
  return { attributes, ...(id || username ? { initiatingActor: { id, username } } : {}) };
};
