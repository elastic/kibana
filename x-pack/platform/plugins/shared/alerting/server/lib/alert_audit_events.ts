/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';
import { ReadOperations, WriteOperations } from '../authorization/types';

export enum AlertAuditAction {
  GET = 'alert_get',
  UPDATE = 'alert_update',
  FIND = 'alert_find',
  DELETE = 'alert_delete',
  SCHEDULE_DELETE = 'alert_schedule_delete',
  ACKNOWLEDGE = 'alert_acknowledge',
  UNACKNOWLEDGE = 'alert_unacknowledge',
}

export const operationAlertAuditActionMap = {
  [WriteOperations.Update]: AlertAuditAction.UPDATE,
  [WriteOperations.Delete]: AlertAuditAction.DELETE,
  [ReadOperations.Find]: AlertAuditAction.FIND,
  [ReadOperations.Get]: AlertAuditAction.GET,
};

/**
 * Maps workflow status values to specific audit actions.
 * Falls back to the generic UPDATE action for unmapped statuses.
 */
export const workflowStatusAuditActionMap: Record<string, AlertAuditAction> = {
  acknowledged: AlertAuditAction.ACKNOWLEDGE,
  open: AlertAuditAction.UNACKNOWLEDGE,
};

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AlertAuditAction, VerbsTuple> = {
  alert_get: ['access', 'accessing', 'accessed'],
  alert_update: ['update', 'updating', 'updated'],
  alert_find: ['access', 'accessing', 'accessed'],
  alert_delete: ['delete', 'deleting', 'deleted'],
  alert_schedule_delete: [
    'schedule deletion task for',
    'scheduling deletion task for',
    'scheduled deletion task for',
  ],
  alert_acknowledge: ['acknowledge', 'acknowledging', 'acknowledged'],
  alert_unacknowledge: ['unacknowledge', 'unacknowledging', 'unacknowledged'],
};

const eventTypes: Record<AlertAuditAction, ArrayElement<EcsEvent['type']>> = {
  alert_get: 'access',
  alert_update: 'change',
  alert_find: 'access',
  alert_delete: 'deletion',
  alert_schedule_delete: 'deletion',
  alert_acknowledge: 'change',
  alert_unacknowledge: 'change',
};

export interface AlertAuditEventParams {
  action: AlertAuditAction;
  actor?: string;
  outcome?: EcsEvent['outcome'];
  id?: string;
  error?: Error;
  bulk?: boolean;
}

export function alertAuditEvent({
  action,
  id,
  outcome,
  error,
  actor = 'User',
  bulk = false,
}: AlertAuditEventParams): AuditEvent {
  let doc: string = '';
  if (id) {
    doc = `alert [id=${id}]`;
  } else {
    doc = bulk ? 'alerts' : 'an alert';
  }
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `${actor} is ${progressive} ${doc}`
    : `${actor} has ${past} ${doc}`;
  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: type ? [type] : undefined,
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

export function alertAuditSystemEvent({
  action,
  id,
  outcome,
  error,
}: AlertAuditEventParams): AuditEvent {
  return alertAuditEvent({
    action,
    id,
    outcome,
    error,
    actor: 'System',
  });
}
