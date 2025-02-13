/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import { AuditEvent } from '@kbn/security-plugin/server';
import { ArrayElement } from '@kbn/utility-types';

export enum ConnectorAuditAction {
  CREATE = 'connector_create',
  GET = 'connector_get',
  UPDATE = 'connector_update',
  DELETE = 'connector_delete',
  FIND = 'connector_find',
  EXECUTE = 'connector_execute',
  GET_GLOBAL_EXECUTION_LOG = 'connector_get_global_execution_log',
  GET_GLOBAL_EXECUTION_KPI = 'connector_get_global_execution_kpi',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<ConnectorAuditAction, VerbsTuple> = {
  connector_create: ['create', 'creating', 'created'],
  connector_get: ['access', 'accessing', 'accessed'],
  connector_update: ['update', 'updating', 'updated'],
  connector_delete: ['delete', 'deleting', 'deleted'],
  connector_find: ['access', 'accessing', 'accessed'],
  connector_execute: ['execute', 'executing', 'executed'],
  connector_get_global_execution_log: ['access', 'accessing', 'accessed'],
  connector_get_global_execution_kpi: ['access', 'accessing', 'accessed'],
};

const eventTypes: Record<ConnectorAuditAction, ArrayElement<EcsEvent['type']> | undefined> = {
  connector_create: 'creation',
  connector_get: 'access',
  connector_update: 'change',
  connector_delete: 'deletion',
  connector_find: 'access',
  connector_execute: undefined,
  connector_get_global_execution_log: 'access',
  connector_get_global_execution_kpi: 'access',
};

export interface ConnectorAuditEventParams {
  action: ConnectorAuditAction;
  outcome?: EcsEvent['outcome'];
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function connectorAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: ConnectorAuditEventParams): AuditEvent {
  const doc = savedObject ? `connector [id=${savedObject.id}]` : 'a connector';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: type ? [type] : undefined,
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
