/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum ScheduledReportAuditAction {
  SCHEDULE = 'scheduled_report_schedule',
  LIST = 'scheduled_report_list',
  DISABLE = 'scheduled_report_disable',
  DELETE = 'scheduled_report_delete',
  UPDATE = 'scheduled_report_update',
  ENABLE = 'scheduled_report_enable',
}

type VerbsTuple = [string, string, string];

const scheduledReportEventVerbs: Record<ScheduledReportAuditAction, VerbsTuple> = {
  scheduled_report_schedule: ['create', 'creating', 'created'],
  scheduled_report_list: ['access', 'accessing', 'accessed'],
  scheduled_report_disable: ['disable', 'disabling', 'disabled'],
  scheduled_report_delete: ['delete', 'deleting', 'deleted'],
  scheduled_report_update: ['update', 'updating', 'updated'],
  scheduled_report_enable: ['enable', 'enabling', 'enabled'],
};

const scheduledReportEventTypes: Record<
  ScheduledReportAuditAction,
  ArrayElement<EcsEvent['type']>
> = {
  scheduled_report_schedule: 'creation',
  scheduled_report_list: 'access',
  scheduled_report_disable: 'change',
  scheduled_report_delete: 'deletion',
  scheduled_report_update: 'update',
  scheduled_report_enable: 'change',
};

export interface ScheduledReportAuditEventParams {
  action: ScheduledReportAuditAction;
  outcome?: EcsEvent['outcome'];
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function scheduledReportAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: ScheduledReportAuditEventParams): AuditEvent {
  const doc = savedObject
    ? [`scheduled report [id=${savedObject.id}]`, savedObject.name && `[name=${savedObject.name}]`]
        .filter(Boolean)
        .join(' ')
    : 'a scheduled report';

  const [present, progressive, past] = scheduledReportEventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = scheduledReportEventTypes[action];

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
