/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEvent } from '@kbn/event-log-plugin/server';
import { AlertInstanceState } from '../types';
import { UntypedNormalizedRuleType } from '../rule_type_registry';

export type Event = Exclude<IEvent, undefined>;

interface CreateAlertEventLogRecordParams {
  executionId?: string;
  ruleId?: string;
  ruleType?: UntypedNormalizedRuleType;
  action: string;
  spaceId?: string;
  consumer?: string;
  ruleName?: string;
  instanceId?: string;
  message?: string;
  state?: AlertInstanceState;
  group?: string;
  namespace?: string;
  timestamp?: string;
  alertUuid?: string;
  task?: {
    scheduled?: string;
    scheduleDelay?: number;
  };
  savedObjects: Array<{
    type?: string;
    id?: string;
    typeId?: string;
    relation?: string;
  }>;
  flapping?: boolean;
  alertSummary?: {
    new: number;
    ongoing: number;
    recovered: number;
  };
  maintenanceWindowIds?: string[];
  ruleRevision?: number;
  gap?: {
    status: string;
    range: {
      gte: string;
      lte: string;
    };
  };
}

export function createAlertEventLogRecordObject(params: CreateAlertEventLogRecordParams): Event {
  const {
    executionId,
    ruleType,
    action,
    state,
    message,
    task,
    ruleId,
    group,
    namespace,
    consumer,
    spaceId,
    flapping,
    alertUuid,
    alertSummary,
    maintenanceWindowIds,
    ruleRevision,
    gap,
  } = params;
  const alerting =
    params.instanceId || group || alertSummary
      ? {
          alerting: {
            ...(params.instanceId ? { instance_id: params.instanceId } : {}),
            ...(group ? { action_group_id: group } : {}),
            ...(alertSummary
              ? {
                  summary: {
                    new: { count: alertSummary.new },
                    ongoing: { count: alertSummary.ongoing },
                    recovered: { count: alertSummary.recovered },
                  },
                }
              : {}),
          },
        }
      : undefined;
  const event: Event = {
    ...(params.timestamp ? { '@timestamp': params.timestamp } : {}),
    event: {
      action,
      kind: 'alert',
      ...(ruleType?.producer ? { category: [ruleType?.producer] } : {}),
      ...(state?.start ? { start: state.start as string } : {}),
      ...(state?.end ? { end: state.end as string } : {}),
      ...(state?.duration !== undefined ? { duration: state.duration as string } : {}),
    },
    kibana: {
      alert: {
        ...(flapping !== undefined ? { flapping } : {}),
        ...(maintenanceWindowIds ? { maintenance_window_ids: maintenanceWindowIds } : {}),
        ...(alertUuid ? { uuid: alertUuid } : {}),
        rule: {
          ...(ruleRevision !== undefined ? { revision: ruleRevision } : {}),
          ...(ruleType?.id ? { rule_type_id: ruleType.id } : {}),
          ...(consumer ? { consumer } : {}),
          ...(executionId
            ? {
                execution: {
                  uuid: executionId,
                },
              }
            : {}),
          ...(gap ? { gap } : {}),
        },
      },
      ...(alerting ? alerting : {}),
      saved_objects: params.savedObjects.map((so) => ({
        ...(so.relation ? { rel: so.relation } : {}),
        type: so.type,
        id: so.id,
        type_id: so.typeId,
        namespace,
      })),
      ...(spaceId ? { space_ids: [spaceId] } : {}),
      ...(task ? { task: { scheduled: task.scheduled, schedule_delay: task.scheduleDelay } } : {}),
    },
    ...(message ? { message } : {}),
    rule: {
      id: ruleId,
      ...(ruleType?.minimumLicenseRequired ? { license: ruleType.minimumLicenseRequired } : {}),
      ...(ruleType?.id ? { category: ruleType.id } : {}),
      ...(ruleType?.producer ? { ruleset: ruleType.producer } : {}),
      ...(params.ruleName ? { name: params.ruleName } : {}),
    },
  };
  return event;
}
