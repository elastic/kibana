/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { ScheduleType } from '@kbn/reporting-server';
import { EventType, FieldType } from '@kbn/reporting-server';

interface CompletionOpts {
  attempt: number;
  byteSize: number;
  scheduledTaskId?: string;
  timeSinceCreation: number;
  scheduleType: ScheduleType;
}

interface CompletionOptsScreenshot extends CompletionOpts {
  numPages: number;
  screenshotLayout: string;
  screenshotPixels: number;
}

interface CompletionOptsCsv extends CompletionOpts {
  csvRows: number;
}

interface FailureOpts {
  timeSinceCreation: number;
  errorCode: string;
  errorMessage: string;
  scheduledTaskId?: string;
  scheduleType: ScheduleType;
}

interface NotificationOpts {
  byteSize: number;
  scheduledTaskId?: string;
  scheduleType: ScheduleType;
}

type NotificationErrorOpts = NotificationOpts & {
  errorMessage: string;
};

export class EventTracker {
  constructor(
    private analytics: AnalyticsServiceStart,
    private reportId: string,
    private exportType: string,
    private objectType: string
  ) {}

  private track(eventType: string, eventFields: object) {
    try {
      this.analytics.reportEvent(eventType, eventFields);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  /*
   * When a request is made to generate a report,
   * track if the request came to the public API
   * (scripts / Watcher) and if the export type is
   * deprecated
   */
  public createReport({
    isDeprecated,
    isPublicApi,
    scheduleType,
  }: {
    isDeprecated: boolean;
    isPublicApi: boolean;
    scheduleType: ScheduleType;
  }) {
    this.track(EventType.REPORT_CREATION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.IS_DEPRECATED]: isDeprecated,
      [FieldType.IS_PUBLIC_API]: isPublicApi,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
    });
  }

  /*
   * When a report job is claimed, the time since
   * creation equals the time spent waiting in the
   * queue.
   */
  public claimJob(opts: {
    timeSinceCreation: number;
    scheduledTaskId?: string;
    scheduleType: ScheduleType;
  }) {
    const { scheduleType, scheduledTaskId, timeSinceCreation } = opts;
    this.track(EventType.REPORT_CLAIM, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  /*
   * When a report job is completed, the time since
   * creation equals the time spent waiting in queue +
   * retries + executing the final report.
   */
  public completeJobScreenshot(opts: CompletionOptsScreenshot) {
    const {
      attempt,
      byteSize,
      timeSinceCreation,
      numPages,
      scheduledTaskId,
      scheduleType,
      screenshotLayout,
      screenshotPixels,
    } = opts;
    this.track(EventType.REPORT_COMPLETION_SCREENSHOT, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.NUM_PAGES]: numPages,
      [FieldType.SCREENSHOT_LAYOUT]: screenshotLayout,
      [FieldType.SCREENSHOT_PIXELS]: screenshotPixels,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      [FieldType.ATTEMPT]: attempt,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  public completeJobCsv(opts: CompletionOptsCsv) {
    const { attempt, byteSize, timeSinceCreation, csvRows, scheduledTaskId, scheduleType } = opts;
    this.track(EventType.REPORT_COMPLETION_CSV, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.CSV_ROWS]: csvRows,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      [FieldType.ATTEMPT]: attempt,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  /*
   * When a report job fails, the time since creation
   * equals the time spent waiting in queue + time
   * spent on retries + the time spent attempting
   * execution
   */
  public failJob(opts: FailureOpts) {
    const { timeSinceCreation, errorMessage, errorCode, scheduledTaskId, scheduleType } = opts;
    this.track(EventType.REPORT_ERROR, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.ERROR_MESSAGE]: errorMessage,
      [FieldType.ERROR_CODE]: errorCode,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  public completeNotification(opts: NotificationOpts) {
    const { byteSize, scheduledTaskId, scheduleType } = opts;
    this.track(EventType.REPORT_NOTIFICATION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  public failedNotification(opts: NotificationErrorOpts) {
    const { byteSize, errorMessage, scheduledTaskId, scheduleType } = opts;
    this.track(EventType.REPORT_NOTIFICATION_ERROR, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.SCHEDULE_TYPE]: scheduleType,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.ERROR_MESSAGE]: errorMessage,
      ...(scheduledTaskId ? { [FieldType.SCHEDULED_TASK_ID]: scheduledTaskId } : {}),
    });
  }

  /*
   * When a report job is downloaded, we want to
   * know how old the job is
   */
  public downloadReport(opts: { timeSinceCreation?: number }) {
    const { timeSinceCreation } = opts;
    this.track(EventType.REPORT_DOWNLOAD, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
    });
  }

  /*
   * When a report job is deleted, we want to know
   * how old the job is, and what type of error it
   * may have had
   */
  public deleteReport(opts: { timeSinceCreation?: number }) {
    const { timeSinceCreation } = opts;
    this.track(EventType.REPORT_DELETION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
    });
  }
}
