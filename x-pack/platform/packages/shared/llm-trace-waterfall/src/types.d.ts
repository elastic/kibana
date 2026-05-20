export interface TraceSpan {
    span_id: string;
    trace_id: string;
    parent_span_id?: string;
    name: string;
    kind?: string;
    status?: string;
    start_time: string;
    end_time?: string;
    duration_ms: number;
    attributes?: Record<string, unknown>;
}
export interface SpanNode extends TraceSpan {
    children: SpanNode[];
    depth: number;
}
