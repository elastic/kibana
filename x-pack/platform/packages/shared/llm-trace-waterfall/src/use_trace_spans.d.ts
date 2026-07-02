import type { TraceSpan } from './types';
interface TraceSpansResult {
    spans: TraceSpan[];
    durationMs: number;
}
export type TraceFetcher = (traceId: string) => Promise<TraceSpansResult>;
export declare const useTraceSpans: (traceId: string | null, { fetchTrace }: {
    fetchTrace: TraceFetcher;
}) => {
    spans: TraceSpan[];
    durationMs: number;
    isLoading: boolean;
    error: Error | null;
};
export {};
