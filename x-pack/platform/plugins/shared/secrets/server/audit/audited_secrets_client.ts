/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, AuditLogger } from '@kbn/core-security-server';
import type { SecretsClient } from '@kbn/secrets';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';

/** Stable action names, for `xpack.security.audit.ignore_filters`. */
export const SECRET_AUDIT_ACTION = {
  create: 'secret_create',
  update: 'secret_update',
  delete: 'secret_delete',
  test: 'secret_test',
  resolve: 'secret_resolve',
} as const;

type SecretAuditOperation = keyof typeof SECRET_AUDIT_ACTION;

interface SecretAuditFailure {
  code: string;
  message: string;
}

const OPERATIONS: Record<
  SecretAuditOperation,
  { type: 'access' | 'change' | 'creation' | 'deletion'; done: string; attempted: string }
> = {
  create: { type: 'creation', done: 'created', attempted: 'create' },
  update: { type: 'change', done: 'updated', attempted: 'update' },
  delete: { type: 'deletion', done: 'deleted', attempted: 'delete' },
  test: { type: 'access', done: 'tested', attempted: 'test' },
  resolve: { type: 'access', done: 'read the value of', attempted: 'read the value of' },
};

const toFailure = (error: unknown): SecretAuditFailure =>
  error instanceof Error
    ? { code: error.name, message: error.message }
    : { code: 'Unknown', message: String(error) };

export interface CreateAuditedSecretsClientParams {
  client: SecretsClient;
  /** The audit logger of the request that the client serves. */
  auditLogger: AuditLogger;
  /** Id of the feature using the client. */
  consumer: string;
  spaceId: string;
}

/**
 * Wraps a secrets client so that creating, updating, deleting, testing and reading a secret
 * each write an audit event. An event names the secret and never carries a value. Listing
 * secrets is not audited: it returns no value.
 */
export const createAuditedSecretsClient = ({
  client,
  auditLogger,
  consumer,
  spaceId,
}: CreateAuditedSecretsClientParams): SecretsClient => {
  const log = ({
    operation,
    name,
    failure,
  }: {
    operation: SecretAuditOperation;
    name: string;
    failure?: SecretAuditFailure;
  }): void => {
    const { type, done, attempted } = OPERATIONS[operation];
    const target = `secret [name=${name}] for [consumer=${consumer}]`;
    const event: AuditEvent = {
      message: failure ? `Failed attempt to ${attempted} ${target}` : `User has ${done} ${target}`,
      event: {
        action: SECRET_AUDIT_ACTION[operation],
        category: ['database'],
        type: [type],
        outcome: failure ? 'failure' : 'success',
      },
      kibana: {
        space_id: spaceId,
        saved_object: {
          type: SECRET_SAVED_OBJECT_TYPE,
          id: getSecretSavedObjectId({ spaceId, name }),
          name,
        },
      },
      ...(failure ? { error: failure } : {}),
    };
    try {
      auditLogger.log(event);
    } catch {
      // Best effort: a failure to write the audit log must not change what the client does.
    }
  };

  const audited = async <TResult>({
    operation,
    name,
    run,
  }: {
    operation: SecretAuditOperation;
    name: string;
    run: () => Promise<TResult>;
  }): Promise<TResult> => {
    try {
      const result = await run();
      log({ operation, name });
      return result;
    } catch (error) {
      log({ operation, name, failure: toFailure(error) });
      throw error;
    }
  };

  return {
    list: () => client.list(),
    listSecretConnectors: () => client.listSecretConnectors(),

    create: (params) =>
      audited({ operation: 'create', name: params.name, run: () => client.create(params) }),

    update: (params) =>
      audited({ operation: 'update', name: params.name, run: () => client.update(params) }),

    delete: (params) =>
      audited({ operation: 'delete', name: params.name, run: () => client.delete(params) }),

    test: async (params) => {
      const { name } = params;
      try {
        const result = await client.test(params);
        log({
          operation: 'test',
          name,
          failure: result.resolved
            ? undefined
            : { code: 'SecretNotReadable', message: result.message },
        });
        return result;
      } catch (error) {
        log({ operation: 'test', name, failure: toFailure(error) });
        throw error;
      }
    },

    // One event for each secret: this is the record of which secrets were used.
    resolve: async (params) => {
      const names = [...new Set(params.names)];
      try {
        const resolved = await client.resolve(params);
        const failures = new Map<string, SecretAuditFailure>([
          ...resolved.missing.map((name): [string, SecretAuditFailure] => [
            name,
            { code: 'SecretNotFound', message: 'The secret does not exist' },
          ]),
          ...resolved.failed.map(({ name, message }): [string, SecretAuditFailure] => [
            name,
            { code: 'SecretNotReadable', message },
          ]),
        ]);
        names.forEach((name) => log({ operation: 'resolve', name, failure: failures.get(name) }));
        return resolved;
      } catch (error) {
        const failure = toFailure(error);
        names.forEach((name) => log({ operation: 'resolve', name, failure }));
        throw error;
      }
    },
  };
};
