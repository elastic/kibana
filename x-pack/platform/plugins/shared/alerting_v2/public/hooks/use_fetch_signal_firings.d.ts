import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
/** A histogram bucket with the bucket start in epoch ms, ready for the chart. */
export interface SignalFiringBucket {
    timeMs: number;
    count: number;
}
export interface UseFetchSignalFiringsOptions {
    ruleId: string | undefined;
    gteMs: number;
    lteMs: number;
    data: DataPublicPluginStart;
}
export interface UseFetchSignalFiringsResult {
    buckets: SignalFiringBucket[];
    /** Bucket interval driving the histogram (e.g. `'1h'`); also sizes the rate unit. */
    interval: string;
    /** Exact epoch ms of the most recent firing, or `null` when there are none. */
    lastFiringMs: number | null;
    isLoading: boolean;
    isHistogramError: boolean;
    isSummaryError: boolean;
    refetch: () => void;
}
export declare const useFetchSignalFirings: ({ ruleId, gteMs, lteMs, data, }: UseFetchSignalFiringsOptions) => UseFetchSignalFiringsResult;
