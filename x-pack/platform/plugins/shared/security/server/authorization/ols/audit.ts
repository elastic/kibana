/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Principal } from '@kbn/ols';
import type { AuditEvent } from '@kbn/security-plugin-types-server';

/**
 * The object-level security (OLS) audit actions.
 */
export type OlsAuditAction =
  | 'ols_create'
  | 'ols_update'
  | 'ols_transfer'
  | 'ols_denied'
  | 'ols_admin_override'
  | 'ols_access';

/**
 * What an OLS audit event records.
 */
export interface OlsAuditEventParams {
  /** What happened. */
  action: OlsAuditAction;
  /** The object type. */
  type: string;
  /** Object ID, or `undefined` for a list that relied on recovery or a new object without one. */
  id?: string;
  /** The object's display name, recorded as the Saved Objects audit events record it. */
  name?: string;
  /** The space of the object. */
  spaceId: string;
  /** The operation that was decided, such as `view`, `use`, or `manage_access`. */
  operation: string;
  /** Principal the decision resolved, used for requests without an authenticated user. */
  principal?: Principal;
  /** Extra non-secret detail, such as the general access or owner before and after a change. */
  details?: string;
}

const MESSAGES: Record<OlsAuditAction, string> = {
  ols_create: 'User is creating',
  ols_update: 'User has changed access to',
  ols_transfer: 'User has changed the owner of',
  ols_denied: 'User was denied access to',
  ols_admin_override: 'User relied on recovery authority to access',
  ols_access: 'User has accessed a restricted',
};

const EVENT_TYPES: Record<OlsAuditAction, 'creation' | 'change' | 'access'> = {
  ols_create: 'creation',
  ols_update: 'change',
  ols_transfer: 'change',
  ols_denied: 'access',
  ols_admin_override: 'access',
  ols_access: 'access',
};

const OUTCOMES: Record<OlsAuditAction, 'success' | 'failure' | 'unknown'> = {
  // Written before the object is stored, as the security extension writes `saved_object_create`.
  ols_create: 'unknown',
  ols_update: 'success',
  ols_transfer: 'success',
  ols_denied: 'failure',
  ols_admin_override: 'success',
  ols_access: 'success',
};

/**
 * Creates an OLS audit event. Messages carry no titles or content. The object's name, when given,
 * goes only into `kibana.saved_object.name`, and callers leave it out when the audit configuration
 * excludes saved object names, as the Saved Objects audit events do.
 *
 * @param params See {@link OlsAuditEventParams}.
 * @returns The audit event to log.
 */
export const olsAuditEvent = ({
  action,
  type,
  id,
  name,
  spaceId,
  operation,
  principal,
  details,
}: OlsAuditEventParams): AuditEvent => {
  const target = id ? `${type} [id=${id}]` : `${type} objects`;
  return {
    message: `${MESSAGES[action]} ${target} (operation: ${operation})${
      details ? ` ${details}` : ''
    }`,
    event: {
      action,
      category: ['database'],
      type: [EVENT_TYPES[action]],
      outcome: OUTCOMES[action],
    },
    kibana: {
      space_id: spaceId,
      ...(id && { saved_object: { type, id, ...(name && { name }) } }),
    },
    // ECS `user.entity.type` keeps a service account from reading as a user.
    ...(principal && { user: { id: principal.id, entity: { type: principal.type } } }),
  };
};
