/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/server';
import { EventType, FieldType } from '@kbn/reporting-server';

interface CompletionOpts {
  byteSize: number;
  timeSinceCreation: number;
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
}

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
  }: {
    isDeprecated: boolean;
    isPublicApi: boolean;
  }) {
    this.track(EventType.REPORT_CREATION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.IS_DEPRECATED]: isDeprecated,
      [FieldType.IS_PUBLIC_API]: isPublicApi,
    });
  }

  /*
   * When a report job is claimed, the time since
   * creation equals the time spent waiting in the
   * queue.
   */
  public claimJob(opts: { timeSinceCreation: number }) {
    const { timeSinceCreation } = opts;
    this.track(EventType.REPORT_CLAIM, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
    });
  }

  /*
   * When a report job is completed, the time since
   * creation equals the time spent waiting in queue +
   * retries + executing the final report.
   */
  public completeJobScreenshot(opts: CompletionOptsScreenshot) {
    const { byteSize, timeSinceCreation, numPages, screenshotLayout, screenshotPixels } = opts;
    this.track(EventType.REPORT_COMPLETION_SCREENSHOT, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.NUM_PAGES]: numPages,
      [FieldType.SCREENSHOT_LAYOUT]: screenshotLayout,
      [FieldType.SCREENSHOT_PIXELS]: screenshotPixels,
    });
  }

  public completeJobCsv(opts: CompletionOptsCsv) {
    const { byteSize, timeSinceCreation, csvRows } = opts;
    this.track(EventType.REPORT_COMPLETION_CSV, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.BYTE_SIZE]: byteSize,
      [FieldType.CSV_ROWS]: csvRows,
    });
  }

  /*
   * When a report job fails, the time since creation
   * equals the time spent waiting in queue + time
   * spent on retries + the time spent attempting
   * execution
   */
  public failJob(opts: FailureOpts) {
    const { timeSinceCreation, errorMessage, errorCode } = opts;
    this.track(EventType.REPORT_ERROR, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION_MS]: timeSinceCreation,
      [FieldType.ERROR_MESSAGE]: errorMessage,
      [FieldType.ERROR_CODE]: errorCode,
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
