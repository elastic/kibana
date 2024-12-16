/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger, CoreAuditService, EcsEvent } from '@kbn/core/server';
import type { ArrayElement } from '@kbn/utility-types';
import type { MlClient, MlClientParams } from './types';
import {
  getADJobIdsFromRequest,
  getDFAJobIdsFromRequest,
  getDatafeedIdsFromRequest,
  getModelIdsFromRequest,
} from './ml_client';

type TaskTypeAD =
  | 'ml_put_ad_job'
  | 'ml_delete_ad_job'
  | 'ml_delete_model_snapshot'
  | 'ml_open_ad_job'
  | 'ml_close_ad_job'
  | 'ml_update_ad_job'
  | 'ml_reset_ad_job'
  | 'ml_revert_ad_snapshot'
  | 'ml_put_ad_datafeed'
  | 'ml_delete_ad_datafeed'
  | 'ml_start_ad_datafeed'
  | 'ml_stop_ad_datafeed'
  | 'ml_update_ad_datafeed'
  | 'ml_put_calendar'
  | 'ml_delete_calendar'
  | 'ml_put_calendar_job'
  | 'ml_delete_calendar_job'
  | 'ml_post_calendar_events'
  | 'ml_delete_calendar_event'
  | 'ml_put_filter'
  | 'ml_update_filter'
  | 'ml_delete_filter'
  | 'ml_forecast'
  | 'ml_delete_forecast';

type TaskTypeDFA =
  | 'ml_put_dfa_job'
  | 'ml_delete_dfa_job'
  | 'ml_start_dfa_job'
  | 'ml_stop_dfa_job'
  | 'ml_update_dfa_job';

type TaskTypeNLP =
  | 'ml_put_trained_model'
  | 'ml_delete_trained_model'
  | 'ml_start_trained_model_deployment'
  | 'ml_stop_trained_model_deployment'
  | 'ml_update_trained_model_deployment'
  | 'ml_infer_trained_model';

type TaskType = TaskTypeAD | TaskTypeDFA | TaskTypeNLP;

const APPLICATION = 'elastic/ml';
const CATEGORY = 'database';

const EVENT_TYPES: Record<string, ArrayElement<EcsEvent['type']>> = {
  creation: 'creation',
  deletion: 'deletion',
  change: 'change',
  access: 'access',
} as const;
type EventTypes = keyof typeof EVENT_TYPES;

interface MlLogEntry {
  event: EcsEvent;
  message: string;
  labels: { application: typeof APPLICATION };
}

export class MlAuditLogger {
  private auditLogger: AuditLogger;
  constructor(audit: CoreAuditService, request?: KibanaRequest) {
    this.auditLogger = request ? audit.asScoped(request) : audit.withoutRequest;
  }

  public async wrapTask<T, P extends MlClientParams>(task: () => T, taskType: TaskType, p: P) {
    try {
      const resp = await task();
      this.logSuccess(taskType, p);
      return resp;
    } catch (error) {
      this.logFailure(taskType, p);
      throw error;
    }
  }

  public logMessage(message: string) {
    this.auditLogger.log({
      message,
      labels: {
        application: APPLICATION,
      },
    });
  }

  private logSuccess(taskType: TaskType, p: MlClientParams) {
    const entry = this.createLogEntry(taskType, p, true);
    if (entry) {
      this.auditLogger.log(entry);
    }
  }
  private logFailure(taskType: TaskType, p: MlClientParams) {
    const entry = this.createLogEntry(taskType, p, false);
    if (entry) {
      this.auditLogger.log(entry);
    }
  }

  private createLogEntry(
    taskType: TaskType,
    p: MlClientParams,
    success: boolean
  ): MlLogEntry | undefined {
    try {
      const { message, type } = this.createPartialLogEntry(taskType, p);
      return {
        event: {
          action: taskType,
          type,
          category: [CATEGORY],
          outcome: success ? 'success' : 'failure',
        },
        message,
        labels: {
          application: APPLICATION,
        },
      };
    } catch (error) {
      // if an unknown task type is passed, we won't log anything
    }
  }

  private createPartialLogEntry(
    taskType: TaskType,
    p: MlClientParams
  ): { message: string; type: EventTypes[] } {
    switch (taskType) {
      /* Anomaly Detection */
      case 'ml_put_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Creating anomaly detection job ${jobId}`, type: [EVENT_TYPES.creation] };
      }
      case 'ml_delete_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Deleting anomaly detection job ${jobId}`, type: [EVENT_TYPES.deletion] };
      }
      case 'ml_delete_model_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const [params] = p as Parameters<MlClient['deleteModelSnapshot']>;
        const snapshotId = params.snapshot_id;
        return {
          message: `Deleting model snapshot ${snapshotId} from job ${jobId}`,
          type: [EVENT_TYPES.deletion],
        };
      }
      case 'ml_open_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Opening anomaly detection job ${jobId}`, type: [EVENT_TYPES.change] };
      }
      case 'ml_close_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Closing anomaly detection job ${jobId}`, type: [EVENT_TYPES.change] };
      }
      case 'ml_update_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Updating anomaly detection job ${jobId}`, type: [EVENT_TYPES.change] };
      }
      case 'ml_reset_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Resetting anomaly detection job ${jobId}`, type: [EVENT_TYPES.change] };
      }
      case 'ml_revert_ad_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const [params] = p as Parameters<MlClient['revertModelSnapshot']>;
        const snapshotId = params.snapshot_id;
        return {
          message: `Reverting anomaly detection snapshot ${snapshotId} in job ${jobId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_put_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        const [jobId] = getADJobIdsFromRequest(p);
        return {
          message: `Creating anomaly detection datafeed ${datafeedId} for job ${jobId}`,
          type: [EVENT_TYPES.creation],
        };
      }
      case 'ml_delete_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return {
          message: `Deleting anomaly detection datafeed ${datafeedId}`,
          type: [EVENT_TYPES.deletion],
        };
      }
      case 'ml_start_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return {
          message: `Starting anomaly detection datafeed ${datafeedId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_stop_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return {
          message: `Stopping anomaly detection datafeed ${datafeedId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_update_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return {
          message: `Updating anomaly detection datafeed ${datafeedId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_put_calendar': {
        const [params] = p as Parameters<MlClient['putCalendar']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const jobIds = (params.body ?? params).job_ids;
        return {
          message: `Creating calendar ${calendarId} ${jobIds ? `with job(s) ${jobIds}` : ''}`,
          type: [EVENT_TYPES.creation],
        };
      }
      case 'ml_delete_calendar': {
        const [params] = p as Parameters<MlClient['deleteCalendar']>;
        const calendarId = params.calendar_id;
        return { message: `Deleting calendar ${calendarId}`, type: [EVENT_TYPES.deletion] };
      }
      case 'ml_put_calendar_job': {
        const [params] = p as Parameters<MlClient['putCalendarJob']>;
        const calendarId = params.calendar_id;
        const jobIds = params.job_id;
        return {
          message: `Adding job(s) ${jobIds} to calendar ${calendarId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_delete_calendar_job': {
        const [params] = p as Parameters<MlClient['deleteCalendarJob']>;
        const calendarId = params.calendar_id;
        const jobIds = params.job_id;
        return {
          message: `Removing job(s) ${jobIds} from calendar ${calendarId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_post_calendar_events': {
        const [params] = p as Parameters<MlClient['postCalendarEvents']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const eventsCount = (params.body ?? params).events;
        return {
          message: `Adding ${eventsCount} event(s) to calendar ${calendarId}`,
          type: [EVENT_TYPES.creation],
        };
      }
      case 'ml_delete_calendar_event': {
        const [params] = p as Parameters<MlClient['deleteCalendarEvent']>;
        const calendarId = params.calendar_id;
        const eventId = params.event_id;
        return {
          message: `Removing event(s) ${eventId} from calendar ${calendarId}`,
          type: [EVENT_TYPES.deletion],
        };
      }
      case 'ml_put_filter': {
        const [params] = p as Parameters<MlClient['putFilter']>;
        const filterId = params.filter_id;
        return { message: `Creating filter ${filterId}`, type: [EVENT_TYPES.creation] };
      }
      case 'ml_update_filter': {
        const [params] = p as Parameters<MlClient['updateFilter']>;
        const filterId = params.filter_id;
        return { message: `Updating filter ${filterId}`, type: [EVENT_TYPES.change] };
      }
      case 'ml_delete_filter': {
        const [params] = p as Parameters<MlClient['deleteFilter']>;
        const filterId = params.filter_id;
        return { message: `Deleting filter ${filterId}`, type: [EVENT_TYPES.deletion] };
      }
      case 'ml_forecast': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Forecasting for job ${jobId}`, type: [EVENT_TYPES.creation] };
      }
      case 'ml_delete_forecast': {
        const [params] = p as Parameters<MlClient['deleteForecast']>;
        const forecastId = params.forecast_id;
        const [jobId] = getADJobIdsFromRequest(p);
        return {
          message: `Deleting forecast ${forecastId} for job ${jobId}`,
          type: [EVENT_TYPES.deletion],
        };
      }

      /* Data Frame Analytics */
      case 'ml_put_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return {
          message: `Creating data frame analytics job ${analyticsId}`,
          type: [EVENT_TYPES.creation],
        };
      }
      case 'ml_delete_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return {
          message: `Deleting data frame analytics job ${analyticsId}`,
          type: [EVENT_TYPES.deletion],
        };
      }
      case 'ml_start_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return {
          message: `Starting data frame analytics job ${analyticsId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_stop_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return {
          message: `Stopping data frame analytics job ${analyticsId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_update_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return {
          message: `Updating data frame analytics job ${analyticsId}`,
          type: [EVENT_TYPES.change],
        };
      }

      /* Trained Models */
      case 'ml_put_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Creating trained model ${modelId}`, type: [EVENT_TYPES.creation] };
      }
      case 'ml_delete_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Deleting trained model ${modelId}`, type: [EVENT_TYPES.deletion] };
      }
      case 'ml_start_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return {
          message: `Starting trained model deployment for model ${modelId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_stop_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return {
          message: `Stopping trained model deployment for model ${modelId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_update_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return {
          message: `Updating trained model deployment for model ${modelId}`,
          type: [EVENT_TYPES.change],
        };
      }
      case 'ml_infer_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Inferring trained model ${modelId}`, type: [EVENT_TYPES.access] };
      }

      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }
}
