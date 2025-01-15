/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEvent,
  IEventLogger,
  millisToNanos,
  SAVED_OBJECT_REL_PRIMARY,
} from '@kbn/event-log-plugin/server';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { TaskRunnerTimings } from '../../task_runner/task_runner_timer';
import { AlertInstanceState, RuleExecutionStatus } from '../../types';
import { createAlertEventLogRecordObject } from '../create_alert_event_log_record_object';
import { RuleRunMetrics } from '../rule_run_metrics_store';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

export interface RuleContext {
  id: string;
  type: UntypedNormalizedRuleType;
  consumer?: string;
  name?: string;
  revision?: number;
}
export interface ContextOpts {
  savedObjectId: string;
  savedObjectType: string;
  namespace?: string;
  spaceId: string;
  executionId: string;
  taskScheduledAt: Date;
}

export type Context = ContextOpts & {
  taskScheduleDelay: number;
};

export const executionType = {
  STANDARD: 'standard',
  BACKFILL: 'backfill',
} as const;
export type ExecutionType = (typeof executionType)[keyof typeof executionType];

interface BackfillOpts {
  id: string;
  start?: string;
  interval?: string;
}

interface DoneOpts {
  timings?: TaskRunnerTimings;
  status?: RuleExecutionStatus;
  metrics?: RuleRunMetrics | null;
  backfill?: BackfillOpts;
}

interface LogTimeoutOpts {
  backfill?: BackfillOpts;
}

interface AlertOpts {
  action: string;
  id: string;
  uuid: string;
  message: string;
  group?: string;
  state?: AlertInstanceState;
  flapping: boolean;
  maintenanceWindowIds?: string[];
}

export interface ActionOpts {
  id: string;
  // uuid is typed as optional but in reality it is always
  // populated - https://github.com/elastic/kibana/issues/195255
  uuid?: string;
  typeId: string;
  alertId?: string;
  alertGroup?: string;
  alertSummary?: {
    new: number;
    ongoing: number;
    recovered: number;
  };
}

export interface SavedObjects {
  id: string;
  type: string;
  namespace?: string;
  relation?: string;
  typeId?: string;
}

export class AlertingEventLogger {
  private eventLogger: IEventLogger;
  private isInitialized = false;
  private startTime?: Date;
  private context?: ContextOpts;
  private ruleData?: RuleContext;
  private relatedSavedObjects: SavedObjects[] = [];
  private executionType: ExecutionType = executionType.STANDARD;

  // this is the "execute" event that will be updated over the lifecycle of this class
  private event: IEvent;

  constructor(eventLogger: IEventLogger) {
    this.eventLogger = eventLogger;
  }

  // For testing purposes
  public getEvent(): IEvent {
    return this.event;
  }

  public initialize({
    context,
    runDate,
    ruleData,
    type = executionType.STANDARD,
  }: {
    context: ContextOpts;
    runDate: Date;
    type?: ExecutionType;
    ruleData?: RuleContext;
  }) {
    if (this.isInitialized || !context) {
      throw new Error('AlertingEventLogger already initialized');
    }
    this.context = context;
    this.ruleData = ruleData;
    this.executionType = type;
    this.startTime = runDate;

    const ctx = {
      ...this.context,
      taskScheduleDelay: this.startTime.getTime() - this.context.taskScheduledAt.getTime(),
    };

    // Populate the "execute" event based on execution type
    switch (type) {
      case executionType.BACKFILL:
        this.initializeBackfill(ctx);
        break;
      default:
        this.initializeStandard(ctx, ruleData);
    }

    this.isInitialized = true;
    this.eventLogger.startTiming(this.event, this.startTime);
  }

  private initializeBackfill(ctx: Context) {
    this.relatedSavedObjects = [
      {
        id: ctx.savedObjectId,
        type: ctx.savedObjectType,
        namespace: ctx.namespace,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
    ];

    // not logging an execute-start event for backfills so just fill in the initial event
    this.event = initializeExecuteBackfillRecord(ctx, this.relatedSavedObjects);
  }

  private initializeStandard(ctx: Context, ruleData?: RuleContext) {
    if (!ruleData) {
      throw new Error('AlertingEventLogger requires rule data');
    }

    this.relatedSavedObjects = [
      {
        id: ctx.savedObjectId,
        type: ctx.savedObjectType,
        typeId: ruleData.type.id,
        namespace: ctx.namespace,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
    ];

    // Initialize the "execute" event
    this.event = initializeExecuteRecord(ctx, ruleData, this.relatedSavedObjects);

    // Create and log "execute-start" event
    const executeStartEvent = {
      ...this.event,
      event: {
        ...this.event.event,
        action: EVENT_LOG_ACTIONS.executeStart,
        ...(this.startTime ? { start: this.startTime.toISOString() } : {}),
      },
      message: `rule execution start: "${ruleData.id}"`,
    };
    this.eventLogger.logEvent(executeStartEvent);
  }

  public getStartAndDuration(): { start?: Date; duration?: string | number } {
    return {
      start: this.startTime,
      duration: this.startTime
        ? millisToNanos(new Date().getTime() - this.startTime!.getTime())
        : '0',
    };
  }

  public addOrUpdateRuleData({
    name,
    id,
    consumer,
    type,
    revision,
  }: {
    name?: string;
    id?: string;
    consumer?: string;
    revision?: number;
    type?: UntypedNormalizedRuleType;
  }) {
    if (!this.isInitialized) {
      throw new Error(`AlertingEventLogger not initialized`);
    }
    if (!this.ruleData) {
      if (!id || !type) throw new Error(`Cannot update rule data before it is initialized`);

      this.ruleData = {
        id,
        type,
      };
    }

    if (name) {
      this.ruleData.name = name;
    }

    if (consumer) {
      this.ruleData.consumer = consumer;
    }

    if (revision) {
      this.ruleData.revision = revision;
    }

    let updatedRelatedSavedObjects = false;
    if (id && type) {
      // add this to saved objects array if it doesn't already exists
      if (!this.relatedSavedObjects.find((so) => so.id === id && so.typeId === type.id)) {
        updatedRelatedSavedObjects = true;
        this.relatedSavedObjects.push({
          id: id!,
          typeId: type?.id,
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: this.context?.namespace,
          relation: SAVED_OBJECT_REL_PRIMARY,
        });
      }
    }

    updateEventWithRuleData(this.event, {
      ruleName: name,
      ruleId: id,
      ruleType: type,
      consumer,
      revision,
      savedObjects: updatedRelatedSavedObjects ? this.relatedSavedObjects : undefined,
    });
  }

  public setExecutionSucceeded(message: string) {
    if (!this.isInitialized || !this.event) {
      throw new Error('AlertingEventLogger not initialized');
    }

    updateEvent(this.event, { message, outcome: 'success', alertingOutcome: 'success' });
  }

  public setMaintenanceWindowIds(maintenanceWindowIds: string[]) {
    if (!this.isInitialized || !this.event) {
      throw new Error('AlertingEventLogger not initialized');
    }

    updateEvent(this.event, { maintenanceWindowIds });
  }

  public setExecutionFailed(message: string, errorMessage: string) {
    if (!this.isInitialized || !this.event) {
      throw new Error('AlertingEventLogger not initialized');
    }

    updateEvent(this.event, {
      message,
      outcome: 'failure',
      alertingOutcome: 'failure',
      error: errorMessage,
    });
  }

  public logTimeout({ backfill }: LogTimeoutOpts = {}) {
    if (!this.isInitialized || !this.context) {
      throw new Error('AlertingEventLogger not initialized');
    }

    if (backfill && this.executionType !== executionType.BACKFILL) {
      throw new Error('Cannot set backfill fields for non-backfill event log doc');
    }

    const executeTimeoutEvent = createExecuteTimeoutRecord(
      this.context,
      this.relatedSavedObjects,
      this.executionType,
      this.ruleData
    );

    if (backfill) {
      updateEvent(executeTimeoutEvent, { backfill });
    }

    this.eventLogger.logEvent(executeTimeoutEvent);
  }

  public logAlert(alert: AlertOpts) {
    if (!this.isInitialized || !this.context || !this.ruleData) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.logEvent(
      createAlertRecord(this.context, this.ruleData, this.relatedSavedObjects, alert)
    );
  }

  public logAction(action: ActionOpts) {
    if (!this.isInitialized || !this.context || !this.ruleData) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.logEvent(
      createActionExecuteRecord(this.context, this.ruleData, this.relatedSavedObjects, action)
    );
  }

  public done({ status, metrics, timings, backfill }: DoneOpts) {
    if (!this.isInitialized || !this.event || !this.context) {
      throw new Error('AlertingEventLogger not initialized');
    }

    if (backfill && this.executionType !== executionType.BACKFILL) {
      throw new Error('Cannot set backfill fields for non-backfill event log doc');
    }

    this.eventLogger.stopTiming(this.event);

    if (status) {
      updateEvent(this.event, { status: status.status });

      if (status.error) {
        const message = this.ruleData
          ? `${this.ruleData.type?.id}:${this.context.savedObjectId}: execution failed`
          : `${this.context.savedObjectId}: execution failed`;
        updateEvent(this.event, {
          outcome: 'failure',
          alertingOutcome: 'failure',
          reason: status.error?.reason || 'unknown',
          error: this.event?.error?.message || status.error.message,
          ...(this.event.message && this.event.event?.outcome === 'failure' ? {} : { message }),
        });
      } else {
        if (status.warning) {
          updateEvent(this.event, {
            alertingOutcome: 'warning',
            reason: status.warning?.reason || 'unknown',
            message: status.warning?.message || this.event?.message,
          });
        }
      }
    }

    if (metrics) {
      updateEvent(this.event, { metrics });
    }

    if (timings) {
      updateEvent(this.event, { timings });
    }

    if (backfill) {
      updateEvent(this.event, { backfill });
    }

    this.eventLogger.logEvent(this.event);
  }
}

export function createAlertRecord(
  context: ContextOpts,
  ruleData: RuleContext,
  savedObjects: SavedObjects[],
  alert: AlertOpts
) {
  return createAlertEventLogRecordObject({
    ruleId: ruleData.id,
    ruleType: ruleData.type,
    consumer: ruleData.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    alertUuid: alert.uuid,
    action: alert.action,
    state: alert.state,
    instanceId: alert.id,
    group: alert.group,
    message: alert.message,
    savedObjects,
    ruleName: ruleData.name,
    flapping: alert.flapping,
    maintenanceWindowIds: alert.maintenanceWindowIds,
    ruleRevision: ruleData.revision,
  });
}

export function createActionExecuteRecord(
  context: ContextOpts,
  ruleData: RuleContext,
  savedObjects: SavedObjects[],
  action: ActionOpts
) {
  return createAlertEventLogRecordObject({
    ruleId: ruleData.id,
    ruleType: ruleData.type,
    consumer: ruleData.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.executeAction,
    instanceId: action.alertId,
    group: action.alertGroup,
    message: `alert: ${ruleData.type?.id}:${ruleData.id}: '${ruleData.name}' instanceId: '${action.alertId}' scheduled actionGroup: '${action.alertGroup}' action: ${action.typeId}:${action.id}`,
    savedObjects: [
      ...savedObjects,
      {
        type: 'action',
        id: action.id,
        typeId: action.typeId,
      },
    ],
    ruleName: ruleData.name,
    alertSummary: action.alertSummary,
    ruleRevision: ruleData.revision,
  });
}

export function createExecuteTimeoutRecord(
  context: ContextOpts,
  savedObjects: SavedObjects[],
  type: ExecutionType,
  ruleData?: RuleContext
) {
  let message = '';
  switch (type) {
    case executionType.BACKFILL:
      message = `backfill "${context.savedObjectId}" cancelled due to timeout`;
      break;
    default:
      message = `rule: ${ruleData?.type?.id}:${context.savedObjectId}: '${
        ruleData?.name ?? ''
      }' execution cancelled due to timeout - exceeded rule type timeout of ${
        ruleData?.type?.ruleTaskTimeout
      }`;
  }
  return createAlertEventLogRecordObject({
    ruleId: ruleData?.id,
    ruleType: ruleData?.type,
    consumer: ruleData?.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.executeTimeout,
    message,
    savedObjects,
    ruleName: ruleData?.name,
    ruleRevision: ruleData?.revision,
  });
}

export function initializeExecuteRecord(
  context: Context,
  ruleData: RuleContext,
  so: SavedObjects[]
) {
  return createAlertEventLogRecordObject({
    ruleId: ruleData.id,
    ruleType: ruleData.type,
    consumer: ruleData.consumer,
    ruleRevision: ruleData.revision,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.execute,
    task: {
      scheduled: context.taskScheduledAt.toISOString(),
      scheduleDelay: Millis2Nanos * context.taskScheduleDelay,
    },
    savedObjects: so,
  });
}

export function initializeExecuteBackfillRecord(context: Context, so: SavedObjects[]) {
  return createAlertEventLogRecordObject({
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.executeBackfill,
    task: {
      scheduled: context.taskScheduledAt.toISOString(),
      scheduleDelay: Millis2Nanos * context.taskScheduleDelay,
    },
    savedObjects: so,
  });
}

interface UpdateEventOpts {
  message?: string;
  outcome?: string;
  alertingOutcome?: string;
  error?: string;
  status?: string;
  reason?: string;
  metrics?: RuleRunMetrics;
  timings?: TaskRunnerTimings;
  backfill?: BackfillOpts;
  maintenanceWindowIds?: string[];
}

interface UpdateRuleOpts {
  ruleName?: string;
  ruleId?: string;
  consumer?: string;
  ruleType?: UntypedNormalizedRuleType;
  revision?: number;
  savedObjects?: SavedObjects[];
}

export function updateEventWithRuleData(event: IEvent, opts: UpdateRuleOpts) {
  const { ruleName, ruleId, consumer, ruleType, revision, savedObjects } = opts;
  if (!event) {
    throw new Error('Cannot update event because it is not initialized.');
  }

  if (ruleName) {
    event.rule = {
      ...event.rule,
      name: ruleName,
    };
  }

  if (ruleId) {
    event.rule = {
      ...event.rule,
      id: ruleId,
    };
  }

  if (consumer) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.consumer = consumer;
  }

  if (ruleType) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    if (ruleType.id) {
      event.kibana.alert.rule.rule_type_id = ruleType.id;
      event.rule = {
        ...event.rule,
        category: ruleType.id,
      };
    }
    if (ruleType.minimumLicenseRequired) {
      event.rule = {
        ...event.rule,
        license: ruleType.minimumLicenseRequired,
      };
    }
    if (ruleType.producer) {
      event.rule = {
        ...event.rule,
        ruleset: ruleType.producer,
      };
    }
  }

  if (revision) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.revision = revision;
  }

  if (savedObjects && savedObjects.length > 0) {
    event.kibana = event.kibana || {};
    event.kibana.saved_objects = savedObjects.map((so) => ({
      ...(so.relation ? { rel: so.relation } : {}),
      type: so.type,
      id: so.id,
      type_id: so.typeId,
      namespace: so.namespace,
    }));
  }
}

export function updateEvent(event: IEvent, opts: UpdateEventOpts) {
  const {
    message,
    outcome,
    error,
    status,
    reason,
    metrics,
    timings,
    alertingOutcome,
    backfill,
    maintenanceWindowIds,
  } = opts;
  if (!event) {
    throw new Error('Cannot update event because it is not initialized.');
  }
  if (message) {
    event.message = message;
  }

  if (outcome) {
    event.event = event.event || {};
    event.event.outcome = outcome;
  }

  if (alertingOutcome) {
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.outcome = alertingOutcome;
  }

  if (error) {
    event.error = event.error || {};
    event.error.message = error;
  }

  if (status) {
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.status = status;
  }

  if (reason) {
    event.event = event.event || {};
    event.event.reason = reason;
  }

  if (metrics) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.execution = event.kibana.alert.rule.execution || {};
    event.kibana.alert.rule.execution.metrics = {
      ...event.kibana.alert.rule.execution.metrics,
      number_of_triggered_actions: metrics.numberOfTriggeredActions
        ? metrics.numberOfTriggeredActions
        : 0,
      number_of_generated_actions: metrics.numberOfGeneratedActions
        ? metrics.numberOfGeneratedActions
        : 0,
      alert_counts: {
        active: metrics.numberOfActiveAlerts ? metrics.numberOfActiveAlerts : 0,
        new: metrics.numberOfNewAlerts ? metrics.numberOfNewAlerts : 0,
        recovered: metrics.numberOfRecoveredAlerts ? metrics.numberOfRecoveredAlerts : 0,
      },
      number_of_delayed_alerts: metrics.numberOfDelayedAlerts ? metrics.numberOfDelayedAlerts : 0,
      number_of_searches: metrics.numSearches ? metrics.numSearches : 0,
      es_search_duration_ms: metrics.esSearchDurationMs ? metrics.esSearchDurationMs : 0,
      total_search_duration_ms: metrics.totalSearchDurationMs ? metrics.totalSearchDurationMs : 0,
    };
  }

  if (backfill) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.execution = event.kibana.alert.rule.execution || {};
    event.kibana.alert.rule.execution.backfill = backfill;
  }

  if (timings) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.execution = event.kibana.alert.rule.execution || {};
    event.kibana.alert.rule.execution.metrics = {
      ...event.kibana.alert.rule.execution.metrics,
      ...timings,
    };
  }

  if (maintenanceWindowIds) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.maintenance_window_ids = maintenanceWindowIds;
  }
}
