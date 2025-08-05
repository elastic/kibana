/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { JOB_STATUS } from '@kbn/reporting-common';
import type { JobId, ReportOutput, ReportSource, TaskRunResult } from '@kbn/reporting-common/types';
import { RecurringSchedule } from '@kbn/response-ops-recurring-schedule-form/types';
import { ReportingPublicPluginStartDependencies } from './plugin';

/*
 * Required services for mounting React components
 */
export type StartServices = [
  Pick<
    CoreStart,
    // required for modules that render React
    | 'rendering'
    // used extensively in Reporting plugin
    | 'application'
    | 'notifications'
    | 'uiSettings'
  >,
  ReportingPublicPluginStartDependencies,
  unknown
];

/*
 * Notifier Toasts
 * @internal
 */
export interface JobSummary {
  id: JobId;
  status: JOB_STATUS;
  jobtype: ReportSource['jobtype'];
  title: ReportSource['payload']['title'];
  errorCode?: ReportOutput['error_code'];
  maxSizeReached: TaskRunResult['max_size_reached'];
  csvContainsFormulas: TaskRunResult['csv_contains_formulas'];
}

/*
 * Notifier Toasts
 * @internal
 */
export interface JobSummarySet {
  completed?: JobSummary[];
  failed?: JobSummary[];
}

export type ReportTypeId = 'pngV2' | 'printablePdfV2' | 'csv_searchsource' | 'csv_v2';

export interface ScheduledReport {
  /**
   * The title of the report, used for the filename and in the UI
   */
  title: string;
  /**
   * The type of report to generate, e.g. 'pngV2', 'printablePdfV2', 'csv_searchsource'
   */
  reportTypeId: ReportTypeId;
  /**
   * PDF-specific option
   * TODO move this to a more specific interface
   */
  optimizedForPrinting?: boolean;
  /**
   * The date when the report should be first generated
   */
  startDate: string;
  /**
   * The timezone associated with the dates
   */
  timezone: string;
  /**
   * Whether the report should be generated on a recurring schedule
   */
  recurring: boolean;
  /**
   * If recurring, the schedule for generating the report
   */
  recurringSchedule: RecurringSchedule;
  /**
   * Boolean indicating whether the report should be sent by email
   */
  sendByEmail: boolean;
  /**
   * List of email addresses to send the report to (`to` field in the email)
   */
  emailRecipients: string[];
}

export interface ReportTypeData {
  label: string;
  id: string;
}
