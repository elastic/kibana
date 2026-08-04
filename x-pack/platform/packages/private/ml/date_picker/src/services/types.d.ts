/**
 * Time definition for `GetTimeFieldRangeResponse` start/end attributes.
 */
interface GetTimeFieldRangeResponseTime {
    /**
     * Timestamp
     */
    epoch: number;
    /**
     * String representation
     */
    string: string;
}
/**
 * Response interface for the `setFullTimeRange` function.
 */
export interface GetTimeFieldRangeResponse {
    /**
     * Success boolean flag.
     */
    success: boolean;
    /**
     * Start time of the time range.
     */
    start: GetTimeFieldRangeResponseTime;
    /**
     * End time of the time range.
     */
    end: GetTimeFieldRangeResponseTime;
}
export {};
