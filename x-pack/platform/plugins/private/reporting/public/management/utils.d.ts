import type { IconType } from '@elastic/eui';
import type { Job } from '@kbn/reporting-public';
import type { ScheduledReportApiJSON } from '@kbn/reporting-common/types';
import type { ScheduledReport } from '../types';
/**
 * This is not the most forward-compatible way of mapping to an {@link IconType} for an application.
 *
 * Ideally apps using reporting should send some metadata for the icon type they want - this is how
 * the saved objects management UI handles icons at the moment.
 */
export declare const guessAppIconTypeFromObjectType: (type: string) => IconType;
export declare const getDisplayNameFromObjectType: (type: string) => string;
export declare const jobHasIssues: (job: Job) => boolean;
export declare const transformScheduledReport: (report: ScheduledReportApiJSON) => ScheduledReport;
export declare const transformEmailNotification: ({ emailRecipients, emailCcRecipients, emailBccRecipients, emailSubject, emailMessage, }: {
    emailRecipients: string[];
    emailCcRecipients: string[];
    emailBccRecipients: string[];
    emailSubject: string;
    emailMessage: string;
}) => NonNullable<NonNullable<ScheduledReportApiJSON["notification"]>["email"]>;
