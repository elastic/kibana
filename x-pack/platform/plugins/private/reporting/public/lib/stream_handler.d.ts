import type * as Rx from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { JobId } from '@kbn/reporting-common/types';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { JobSummarySet } from '../types';
export declare class ReportingNotifierStreamHandler {
    private apiClient;
    private core;
    private jobCompletionNotifications;
    constructor(apiClient: ReportingAPIClient, core: CoreStart);
    startPolling(interval: number, stop$: Rx.Observable<void>): void;
    protected showNotifications({ completed: completedJobs, failed: failedJobs, }: JobSummarySet): Rx.Observable<JobSummarySet>;
    protected findChangedStatusJobs(previousPending: JobId[]): Rx.Observable<JobSummarySet>;
}
