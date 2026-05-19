/**
 * Log rate histogram item
 */
export interface LogRateHistogramItem {
    /**
     * Time of bucket
     */
    time: number;
    /**
     * Number of doc count for that time bucket
     */
    value: number;
}
