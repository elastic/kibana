import type { TraceSpan } from './types';
interface TraceSpanSource {
    span_id?: string;
    parent_span_id?: string;
    trace_id?: string;
    name?: string;
    kind?: string;
    status?: {
        code?: string | number;
    };
    '@timestamp'?: string;
    end_time?: string;
    duration?: number;
    attributes?: Record<string, unknown>;
}
export declare const mapEsSourceToTraceSpan: (source: TraceSpanSource, id?: string) => TraceSpan;
export {};
