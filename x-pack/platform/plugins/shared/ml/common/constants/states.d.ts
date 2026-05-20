/**
 * The status of the datafeed.
 */
export declare enum DATAFEED_STATE {
    STARTED = "started",
    STARTING = "starting",
    STOPPED = "stopped",
    STOPPING = "stopping",
    DELETED = "deleted"
}
/**
 * The status of the anomaly detection job forecast.
 */
export declare enum FORECAST_REQUEST_STATE {
    FAILED = "failed",
    FINISHED = "finished",
    SCHEDULED = "scheduled",
    STARTED = "started"
}
/**
 * The status of the anomaly detection job.
 */
export declare enum JOB_STATE {
    CLOSED = "closed",
    CLOSING = "closing",
    FAILED = "failed",
    OPENED = "opened",
    OPENING = "opening",
    DELETED = "deleted"
}
