import type { CoreStart } from '@kbn/core/public';
import type { JOB_STATUS } from '@kbn/reporting-common';
import type { JobId, ReportOutput, ReportSource, TaskRunResult } from '@kbn/reporting-common/types';
import type { RecurringSchedule } from '@kbn/response-ops-recurring-schedule-form/types';
import type { ReportingPublicPluginStartDependencies } from './plugin';
export type StartServices = [
    Pick<CoreStart, 'rendering' | 'application' | 'notifications' | 'uiSettings' | 'userProfile'>,
    ReportingPublicPluginStartDependencies,
    unknown
];
export interface JobSummary {
    id: JobId;
    status: JOB_STATUS;
    jobtype: ReportSource['jobtype'];
    title: ReportSource['payload']['title'];
    errorCode?: ReportOutput['error_code'];
    maxSizeReached: TaskRunResult['max_size_reached'];
    csvContainsFormulas: TaskRunResult['csv_contains_formulas'];
}
export interface JobSummarySet {
    completed?: JobSummary[];
    failed?: JobSummary[];
}
export type ReportTypeId = 'pngV2' | 'printablePdfV2' | 'csv_searchsource' | 'csv_v2';
export interface ScheduledReport {
    /**
     * The id of the report
     */
    id: string;
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
    /**
     * List of email addresses to send the report in copy to (`cc` field in the email)
     */
    emailCcRecipients: string[];
    /**
     * List of email addresses to send the report in blind copy to (`bcc` field in the email)
     */
    emailBccRecipients: string[];
    /**
     * Email subject
     */
    emailSubject: string;
    /**
     * Email message
     */
    emailMessage: string;
}
export interface ReportTypeData {
    label: string;
    id: string;
}
