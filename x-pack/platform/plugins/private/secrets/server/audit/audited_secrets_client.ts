/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, AuditLogger, EcsEvent } from '@kbn/core/server';
import type { SecretsClient } from '../client/types';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';

type SecretAuditAction = 'secret_find' | 'secret_create' | 'secret_update' | 'secret_delete';

const SECRET_AUDIT_ACTIONS: Record<
  SecretAuditAction,
  { type: EcsEvent['type']; present: string; past: string }
> = {
  secret_find: { type: ['access'], present: 'access', past: 'accessed' },
  secret_create: { type: ['creation'], present: 'create', past: 'created' },
  secret_update: { type: ['change'], present: 'update', past: 'updated' },
  secret_delete: { type: ['deletion'], present: 'delete', past: 'deleted' },
};

interface SecretAuditEventParams {
  readonly action: SecretAuditAction;
  /** The secret the event is about. Omitted when a list fails. */
  readonly savedObject?: { type: string; id: string; name?: string };
  readonly error?: Error;
}

const secretAuditEvent = ({ action, savedObject, error }: SecretAuditEventParams): AuditEvent => {
  const { type, present, past } = SECRET_AUDIT_ACTIONS[action];
  const target = savedObject
    ? [`secret [id=${savedObject.id}]`, savedObject.name && `[name=${savedObject.name}]`]
        .filter(Boolean)
        .join(' ')
    : 'secrets';
  return {
    message: error ? `Failed attempt to ${present} ${target}` : `User has ${past} ${target}`,
    event: {
      action,
      category: ['database'],
      type,
      outcome: error ? 'failure' : 'success',
    },
    kibana: { saved_object: savedObject },
    error: error && { code: error.name, message: error.message },
  };
};

const toError = (thrown: unknown): Error =>
  thrown instanceof Error ? thrown : new Error(String(thrown));

export interface CreateAuditedSecretsClientParams {
  readonly client: SecretsClient;
  /** Scoped to the request the client serves, so that events carry its user and space. */
  readonly auditLogger: AuditLogger;
  readonly spaceId: string;
}

/**
 * Wraps a secrets client so that every operation is recorded in the audit log. An event names
 * the secret and its saved object, never its value.
 */
export const createAuditedSecretsClient = ({
  client,
  auditLogger,
  spaceId,
}: CreateAuditedSecretsClientParams): SecretsClient => {
  const log = ({
    action,
    name,
    error,
  }: {
    action: SecretAuditAction;
    name?: string;
    error?: Error;
  }) => {
    if (!auditLogger.enabled) {
      return;
    }
    const savedObject =
      name === undefined
        ? undefined
        : {
            type: SECRET_SAVED_OBJECT_TYPE,
            id: getSecretSavedObjectId({ spaceId, name }),
            ...(auditLogger.includeSavedObjectNames ? { name } : {}),
          };
    auditLogger.log(secretAuditEvent({ action, savedObject, error }));
  };

  /** Runs an operation and records its failure; success is recorded by the caller. */
  const recordingFailure = async <T>({
    action,
    name,
    operation,
  }: {
    action: SecretAuditAction;
    name?: string;
    operation: () => Promise<T>;
  }): Promise<T> => {
    try {
      return await operation();
    } catch (thrown) {
      log({ action, name, error: toError(thrown) });
      throw thrown;
    }
  };

  return {
    list: async () => {
      const action = 'secret_find';
      const secrets = await recordingFailure({ action, operation: () => client.list() });
      // One event per secret returned, like saved objects and rules.
      secrets.forEach(({ name }) => log({ action, name }));
      return secrets;
    },

    create: async (params) => {
      const action = 'secret_create';
      const { name } = params;
      const created = await recordingFailure({
        action,
        name,
        operation: () => client.create(params),
      });
      log({ action, name });
      return created;
    },

    update: async (params) => {
      const action = 'secret_update';
      const { name } = params;
      const updated = await recordingFailure({
        action,
        name,
        operation: () => client.update(params),
      });
      log({ action, name });
      return updated;
    },

    delete: async (params) => {
      const action = 'secret_delete';
      const { name } = params;
      await recordingFailure({ action, name, operation: () => client.delete(params) });
      log({ action, name });
    },
  };
};
