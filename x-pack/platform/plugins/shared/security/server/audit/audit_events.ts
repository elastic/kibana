/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent, KibanaRequest } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin-types-server';
import type { ArrayElement } from '@kbn/utility-types';

import type { AuthenticationProvider } from '../../common';
import type { AuthenticationResult } from '../authentication/authentication_result';
import type {
  AuditAction,
  AddAuditEventParams as SavedObjectEventParams,
} from '../saved_objects/saved_objects_security_extension';

export interface HttpRequestParams {
  request: KibanaRequest;
}

export function httpRequestEvent({ request }: HttpRequestParams): AuditEvent {
  const url = request.rewrittenUrl ?? request.url;

  return {
    message: `User is requesting [${url.pathname}] endpoint`,
    event: {
      action: 'http_request',
      category: ['web'],
      outcome: 'unknown',
    },
    http: {
      request: {
        method: request.route.method,
      },
    },
    url: {
      domain: url.hostname,
      path: url.pathname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      query: url.search ? url.search.slice(1) : undefined,
      scheme: url.protocol ? url.protocol.substr(0, url.protocol.length - 1) : undefined,
    },
  };
}

export interface UserLoginParams {
  authenticationResult: AuthenticationResult;
  authenticationProvider?: string;
  authenticationType?: string;
  sessionId?: string;
  userProfileId?: string;
}

export function userLoginEvent({
  authenticationResult,
  authenticationProvider,
  authenticationType,
  sessionId,
  userProfileId,
}: UserLoginParams): AuditEvent {
  return {
    message: authenticationResult.user
      ? `User [${authenticationResult.user.username}] has logged in using ${authenticationType} provider [name=${authenticationProvider}]`
      : `Failed attempt to login using ${authenticationType} provider [name=${authenticationProvider}]`,
    event: {
      action: 'user_login',
      category: ['authentication'],
      outcome: authenticationResult.user ? 'success' : 'failure',
    },
    user: authenticationResult.user && {
      id: userProfileId,
      name: authenticationResult.user.username,
      ...(authenticationResult.user.email ? { email: authenticationResult.user.email } : {}),
      ...(authenticationResult.user.full_name
        ? { full_name: authenticationResult.user.full_name }
        : {}),
      roles: authenticationResult.user.roles as string[],
    },
    kibana: {
      space_id: undefined, // Ensure this does not get populated by audit service
      session_id: sessionId,
      authentication_provider: authenticationProvider,
      authentication_type: authenticationType,
      authentication_realm: authenticationResult.user?.authentication_realm.name,
      lookup_realm: authenticationResult.user?.lookup_realm.name,
    },
    error: authenticationResult.error && {
      code: authenticationResult.error.name,
      message: authenticationResult.error.message,
    },
  };
}

export interface UserLogoutParams {
  username?: string;
  provider: AuthenticationProvider;
  userProfileId?: string;
}

export function userLogoutEvent({
  username,
  provider,
  userProfileId,
}: UserLogoutParams): AuditEvent {
  return {
    message: `User [${username}] is logging out using ${provider.type} provider [name=${provider.name}]`,
    event: {
      action: 'user_logout',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user:
      userProfileId || username
        ? {
            id: userProfileId,
            name: username,
          }
        : undefined,
    kibana: {
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export function userSessionConcurrentLimitLogoutEvent({
  username,
  provider,
  userProfileId,
}: UserLogoutParams): AuditEvent {
  return {
    message: `User [${username}] is logging out due to exceeded concurrent sessions limit for ${provider.type} provider [name=${provider.name}]`,
    event: {
      action: 'user_logout',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user:
      userProfileId || username
        ? {
            id: userProfileId,
            name: username,
          }
        : undefined,
    kibana: {
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export interface SessionCleanupParams {
  sessionId: string;
  usernameHash?: string;
  provider: AuthenticationProvider;
}

export function sessionCleanupEvent({
  usernameHash,
  sessionId,
  provider,
}: SessionCleanupParams): AuditEvent {
  return {
    message: `Removing invalid or expired session for user [hash=${usernameHash}]`,
    event: {
      action: 'session_cleanup',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user: {
      hash: usernameHash,
    },
    kibana: {
      session_id: sessionId,
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export function sessionCleanupConcurrentLimitEvent({
  usernameHash,
  sessionId,
  provider,
}: SessionCleanupParams): AuditEvent {
  return {
    message: `Removing session for user [hash=${usernameHash}] due to exceeded concurrent sessions limit`,
    event: {
      action: 'session_cleanup',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user: {
      hash: usernameHash,
    },
    kibana: {
      session_id: sessionId,
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export interface AccessAgreementAcknowledgedParams {
  username: string;
  provider: AuthenticationProvider;
}

export function accessAgreementAcknowledgedEvent({
  username,
  provider,
}: AccessAgreementAcknowledgedParams): AuditEvent {
  return {
    message: `${username} acknowledged access agreement using ${provider.type} provider [name=${provider.name}].`,
    event: {
      action: 'access_agreement_acknowledged',
      category: ['authentication'],
    },
    user: {
      name: username,
    },
    kibana: {
      space_id: undefined, // Ensure this does not get populated by audit service
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

type VerbsTuple = [string, string, string];

const savedObjectAuditVerbs: Record<AuditAction, VerbsTuple> = {
  saved_object_create: ['create', 'creating', 'created'],
  saved_object_get: ['access', 'accessing', 'accessed'],
  saved_object_resolve: ['resolve', 'resolving', 'resolved'],
  saved_object_update: ['update', 'updating', 'updated'],
  saved_object_delete: ['delete', 'deleting', 'deleted'],
  saved_object_find: ['access', 'accessing', 'accessed'],
  saved_object_open_point_in_time: [
    'open point-in-time',
    'opening point-in-time',
    'opened point-in-time',
  ],
  saved_object_close_point_in_time: [
    'close point-in-time',
    'closing point-in-time',
    'closed point-in-time',
  ],
  saved_object_remove_references: [
    'remove references to',
    'removing references to',
    'removed references to',
  ],
  saved_object_collect_multinamespace_references: [
    'collect references and spaces of',
    'collecting references and spaces of',
    'collected references and spaces of',
  ],
  saved_object_update_objects_spaces: [
    'update spaces of',
    'updating spaces of',
    'updated spaces of',
  ],
  saved_object_update_objects_owner: ['update owner of', 'updating owner of', 'updated owner of'],
  saved_object_update_objects_access_mode: [
    'update access mode of',
    'updating access mode of',
    'updated access mode of',
  ],
};

const savedObjectAuditTypes: Record<AuditAction, ArrayElement<EcsEvent['type']>> = {
  saved_object_create: 'creation',
  saved_object_get: 'access',
  saved_object_resolve: 'access',
  saved_object_update: 'change',
  saved_object_delete: 'deletion',
  saved_object_find: 'access',
  saved_object_open_point_in_time: 'creation',
  saved_object_close_point_in_time: 'deletion',
  saved_object_remove_references: 'change',
  saved_object_collect_multinamespace_references: 'access',
  saved_object_update_objects_spaces: 'change',
  saved_object_update_objects_owner: 'change',
  saved_object_update_objects_access_mode: 'change',
};

export function savedObjectEvent({
  action,
  savedObject,
  addToSpaces,
  deleteFromSpaces,
  unauthorizedSpaces,
  unauthorizedTypes,
  outcome,
  error,
}: SavedObjectEventParams): AuditEvent | undefined {
  const doc = savedObject ? `${savedObject.type} [id=${savedObject.id}]` : 'saved objects';
  const [present, progressive, past] = savedObjectAuditVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = savedObjectAuditTypes[action];

  if (
    type === 'access' &&
    savedObject &&
    (savedObject.type === 'config' || savedObject.type === 'telemetry')
  ) {
    return;
  }

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [type],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: savedObject,
      add_to_spaces: addToSpaces,
      delete_from_spaces: deleteFromSpaces,
      unauthorized_spaces: unauthorizedSpaces,
      unauthorized_types: unauthorizedTypes,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

export enum SpaceAuditAction {
  CREATE = 'space_create',
  GET = 'space_get',
  UPDATE = 'space_update',
  DELETE = 'space_delete',
  FIND = 'space_find',
}

const spaceAuditVerbs: Record<SpaceAuditAction, VerbsTuple> = {
  space_create: ['create', 'creating', 'created'],
  space_get: ['access', 'accessing', 'accessed'],
  space_update: ['update', 'updating', 'updated'],
  space_delete: ['delete', 'deleting', 'deleted'],
  space_find: ['access', 'accessing', 'accessed'],
};

const spaceAuditTypes: Record<SpaceAuditAction, ArrayElement<EcsEvent['type']>> = {
  space_create: 'creation',
  space_get: 'access',
  space_update: 'change',
  space_delete: 'deletion',
  space_find: 'access',
};

export interface SpacesAuditEventParams {
  action: SpaceAuditAction;
  outcome?: EcsEvent['outcome'];
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function spaceAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: SpacesAuditEventParams): AuditEvent {
  const doc = savedObject ? `space [id=${savedObject.id}]` : 'spaces';
  const [present, progressive, past] = spaceAuditVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = spaceAuditTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [type],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: savedObject,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

export enum ServiceAccountAuditAction {
  ASSUME = 'service_account_assume',
  CREATE = 'service_account_create',
  DELETE = 'service_account_delete',
  WORKLOAD_BIND = 'service_account_workload_bind',
  WORKLOAD_UNBIND = 'service_account_workload_unbind',
}

const serviceAccountAuditVerbs: Record<ServiceAccountAuditAction, VerbsTuple> = {
  service_account_assume: ['assume', 'assuming', 'assumed'],
  service_account_create: ['create', 'creating', 'created'],
  service_account_delete: ['delete', 'deleting', 'deleted'],
  service_account_workload_bind: ['bind', 'binding', 'bound'],
  service_account_workload_unbind: ['unbind', 'unbinding', 'unbound'],
};

const serviceAccountAuditCategories: Record<
  ServiceAccountAuditAction,
  ArrayElement<EcsEvent['category']>
> = {
  service_account_assume: 'authentication',
  service_account_create: 'iam',
  service_account_delete: 'iam',
  service_account_workload_bind: 'iam',
  service_account_workload_unbind: 'iam',
};

const serviceAccountAuditTypes: Record<
  ServiceAccountAuditAction,
  ArrayElement<EcsEvent['type']>
> = {
  service_account_assume: 'start',
  service_account_create: 'creation',
  service_account_delete: 'deletion',
  service_account_workload_bind: 'change',
  service_account_workload_unbind: 'change',
};

export interface ServiceAccountAuditEventParams {
  action: ServiceAccountAuditAction;
  /**
   * The account the event targets, recorded as ECS `user.target`. Omitted when it is unknown or
   * cannot be trusted: an unbind addresses the binding by its coordinates and never reads the
   * account it names, a create that failed before validation may carry a name Kibana rejected,
   * and a binding that failed integrity verification may name any account.
   *
   * For {@link ServiceAccountAuditAction.ASSUME} the account is the actor instead, so it is recorded
   * as `user` itself and not as a target.
   */
  serviceAccount?: { id?: string; name?: string };
  /** The workload a binding or execution event addresses. */
  workload?: NonNullable<AuditEvent['kibana']>['workload'];
  /**
   * The space of an event logged without a request. A scoped logger takes the space from the
   * request instead, and would have it overwritten by any `kibana.space_id` the event carries.
   */
  spaceId?: string;
  /**
   * Whether a delete skips the check for bound workloads, which it leaves behind. Recorded in the
   * message only.
   */
  force?: boolean;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

export function serviceAccountAuditEvent({
  action,
  serviceAccount,
  workload,
  spaceId,
  force,
  outcome,
  error,
}: ServiceAccountAuditEventParams): AuditEvent {
  if (action === ServiceAccountAuditAction.ASSUME) {
    return serviceAccountAssumeEvent({
      serviceAccountId: serviceAccount?.id,
      workload,
      spaceId,
      error,
    });
  }

  const target = serviceAccount
    ? {
        ...(serviceAccount.id ? { id: serviceAccount.id } : {}),
        ...(serviceAccount.name ? { name: serviceAccount.name } : {}),
      }
    : undefined;
  const targetAttributes = target
    ? Object.entries(target).map(([key, value]) => `${key}=${value}`)
    : [];
  const accountDoc =
    targetAttributes.length > 0
      ? `service account [${targetAttributes.join(', ')}]`
      : 'service account';
  const workloadDoc = workload
    ? ` ${action === ServiceAccountAuditAction.WORKLOAD_UNBIND ? 'from' : 'to'} workload [${
        workload.plugin_id
      }/${workload.type}/${workload.id}]`
    : '';
  const doc = `${accountDoc}${workloadDoc}${force ? ' [force=true]' : ''}`;

  const [present, progressive, past] = serviceAccountAuditVerbs[action];
  // An error with an `unknown` outcome is a failure whose cleanup could not be confirmed, so the
  // object of the attempt may still exist.
  const message = error
    ? `Failed attempt to ${present} ${doc}${
        outcome === 'unknown' ? ', which might have been left behind' : ''
      }`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;

  return {
    message,
    event: {
      action,
      category: [serviceAccountAuditCategories[action]],
      // ECS gives an IAM event two types: the activity, and that a user (not a group) is managed.
      type: ['user', serviceAccountAuditTypes[action]],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    ...(targetAttributes.length > 0 ? { user: { target } } : {}),
    ...(workload ? { kibana: { workload } } : {}),
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

/**
 * A workload starting to run as its service account, or failing to. The account is the actor, so
 * the event names it as `user` itself. A scoped logger replaces that with the same account, read
 * from the fake request, but an event logged without a request has nothing else to go on.
 */
const serviceAccountAssumeEvent = ({
  serviceAccountId,
  workload,
  spaceId,
  error,
}: {
  serviceAccountId?: string;
  workload?: NonNullable<AuditEvent['kibana']>['workload'];
  spaceId?: string;
  error?: Error;
}): AuditEvent => {
  const workloadDoc = workload
    ? `Workload [${workload.plugin_id}/${workload.type}/${workload.id}]`
    : 'Workload';
  const accountDoc = serviceAccountId
    ? `service account [id=${serviceAccountId}]`
    : 'its service account';

  return {
    message: error
      ? `${workloadDoc} failed to execute as ${accountDoc}`
      : `${workloadDoc} is executing as ${accountDoc}`,
    event: {
      action: ServiceAccountAuditAction.ASSUME,
      category: [serviceAccountAuditCategories[ServiceAccountAuditAction.ASSUME]],
      type: [serviceAccountAuditTypes[ServiceAccountAuditAction.ASSUME]],
      outcome: error ? 'failure' : 'success',
    },
    ...(serviceAccountId
      ? {
          user: {
            id: serviceAccountId,
            name: serviceAccountId,
          },
        }
      : {}),
    ...(workload || spaceId !== undefined
      ? {
          kibana: {
            ...(workload ? { workload } : {}),
            ...(spaceId !== undefined ? { space_id: spaceId } : {}),
          },
        }
      : {}),
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};
