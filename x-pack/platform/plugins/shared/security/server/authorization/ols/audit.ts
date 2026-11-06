/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'async_hooks';

import type { Principal } from '@kbn/ols';
import type { AuditEvent, AuditLogger } from '@kbn/security-plugin-types-server';

export type OlsAuditAction =
  | 'ols_update'
  | 'ols_transfer'
  | 'ols_denied'
  | 'ols_admin_override'
  | 'ols_access';

export interface OlsAuditEventParams {
  action: OlsAuditAction;
  type: string;
  /** Object ID, or `undefined` for a list that relied on recovery. */
  id?: string;
  spaceId: string;
  operation: string;
  /** Principal the decision resolved, used for requests without an authenticated user. */
  principal?: Principal;
  /** Extra non-secret detail, such as the general access or owner before and after a change. */
  details?: string;
}

const MESSAGES: Record<OlsAuditAction, string> = {
  ols_update: 'User has changed access to',
  ols_transfer: 'User has changed the owner of',
  ols_denied: 'User was denied access to',
  ols_admin_override: 'User relied on recovery authority to access',
  ols_access: 'User has accessed a restricted',
};

/**
 * Creates an object-level security audit event. Messages carry no titles or content, so an event
 * about a hidden object discloses nothing beyond its type and ID.
 */
export const olsAuditEvent = ({
  action,
  type,
  id,
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
      type: [action === 'ols_update' || action === 'ols_transfer' ? 'change' : 'access'],
      outcome: action === 'ols_denied' ? 'failure' : 'success',
    },
    kibana: {
      space_id: spaceId,
      ...(id && { saved_object: { type, id } }),
    },
    ...(principal && { user: { id: principal.id } }),
  };
};

/**
 * Audit events held until a repository operation completes, together with the objects that
 * object-level security denied during it.
 */
interface AuditScope {
  events: Array<{ logger: AuditLogger; event: AuditEvent }>;
  deniedObjects: Set<string>;
}

const auditScopes = new AsyncLocalStorage<AuditScope>();

/**
 * Runs an operation with audit events held until it completes, then writes them. An object that
 * object-level security denied is logged only as that denial: any `saved_object_*` event the
 * security extension wrote about it during the operation is dropped, so the audit log never shows a
 * success, or an operation in progress, for an object the caller could not see.
 *
 * The scope follows the async context, so concurrent operations on the same request never mix
 * their events. A nested operation joins the scope of its caller.
 */
export const runInAuditScope = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (auditScopes.getStore()) {
    return await operation();
  }

  const scope: AuditScope = { events: [], deniedObjects: new Set() };
  try {
    return await auditScopes.run(scope, operation);
  } finally {
    for (const { logger, event } of scope.events) {
      if (!isSupersededByDenial(event, scope.deniedObjects)) {
        logger.log(event);
      }
    }
  }
};

/**
 * Records that object-level security denied an object in the current audit scope, if any.
 */
export const recordDeniedObject = (type: string, id: string) => {
  auditScopes.getStore()?.deniedObjects.add(getObjectKey(type, id));
};

/**
 * Wraps an audit logger so that, within an audit scope, its events are held until the scope ends.
 * Outside a scope it logs immediately, as the wrapped logger does.
 */
export const createScopedAuditLogger = (logger: AuditLogger): AuditLogger => ({
  log: (event) => {
    const scope = auditScopes.getStore();
    if (scope && event) {
      scope.events.push({ logger, event });
    } else {
      logger.log(event);
    }
  },
  get enabled() {
    return logger.enabled;
  },
  get includeSavedObjectNames() {
    return logger.includeSavedObjectNames;
  },
});

const isSupersededByDenial = (event: AuditEvent, deniedObjects: Set<string>) => {
  const savedObject = event.kibana?.saved_object;
  return (
    !!savedObject &&
    !!event.event?.action?.startsWith('saved_object_') &&
    deniedObjects.has(getObjectKey(savedObject.type, savedObject.id))
  );
};

const getObjectKey = (type: string, id: string) => `${type}:${id}`;
