import type { Environment } from './environment_rt';
declare enum JOB_STATE {
    CLOSED = "closed",
    CLOSING = "closing",
    FAILED = "failed",
    OPENED = "opened",
    OPENING = "opening",
    DELETED = "deleted"
}
declare enum DATAFEED_STATE {
    STARTED = "started",
    STARTING = "starting",
    STOPPED = "stopped",
    STOPPING = "stopping",
    DELETED = "deleted"
}
export interface ApmMlJob {
    environment: Environment;
    version: number;
    jobId: string;
    jobState?: JOB_STATE;
    datafeedId?: string;
    datafeedState?: DATAFEED_STATE;
    bucketSpan?: string;
}
export {};
