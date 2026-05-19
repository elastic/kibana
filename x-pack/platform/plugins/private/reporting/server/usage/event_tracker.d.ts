import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { ScheduleType } from '@kbn/reporting-server';
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
export declare class EventTracker {
    private analytics;
    private reportId;
    private exportType;
    private objectType;
    constructor(analytics: AnalyticsServiceStart, reportId: string, exportType: string, objectType: string);
    private track;
    createReport({ isDeprecated, isPublicApi, scheduleType, }: {
        isDeprecated: boolean;
        isPublicApi: boolean;
        scheduleType: ScheduleType;
    }): void;
    claimJob(opts: {
        timeSinceCreation: number;
        scheduledTaskId?: string;
        scheduleType: ScheduleType;
    }): void;
    completeJobScreenshot(opts: CompletionOptsScreenshot): void;
    completeJobCsv(opts: CompletionOptsCsv): void;
    failJob(opts: FailureOpts): void;
    completeNotification(opts: NotificationOpts): void;
    failedNotification(opts: NotificationErrorOpts): void;
    downloadReport(opts: {
        timeSinceCreation?: number;
    }): void;
    deleteReport(opts: {
        timeSinceCreation?: number;
    }): void;
}
export {};
