import type { JobCreator } from '../jobs/new_job/common/job_creator/job_creator';
interface TempJobCloningData {
    createdBy: any;
    datafeed: any;
    job: any;
    skipTimeRangeStep: boolean;
    start?: any;
    end?: any;
    calendars: any;
    autoSetTimeRange?: boolean;
}
export declare class JobCloningService {
    private tempJobCloningData;
    getJobCloningData(): Readonly<TempJobCloningData>;
    clearJobCloningData(): void;
    stashJobForCloning(jobCreator: JobCreator, skipTimeRangeStep: boolean, includeTimeRange: boolean, autoSetTimeRange?: boolean): void;
    checkForAutoStartDatafeed(): {
        id: any;
        hasDatafeed: boolean;
        latestTimestampSortValue: number;
        datafeedId: unknown;
    } | undefined;
    stashJobCloningData(config: TempJobCloningData): void;
    get createdBy(): any;
    get datafeed(): any;
    get job(): any;
    get skipTimeRangeStep(): boolean;
    get start(): any;
    get end(): any;
    get calendars(): any;
    get autoSetTimeRange(): boolean | undefined;
}
export declare const jobCloningService: JobCloningService;
export {};
