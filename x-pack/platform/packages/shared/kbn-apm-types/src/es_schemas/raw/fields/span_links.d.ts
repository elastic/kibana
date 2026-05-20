export interface SpanLink {
    trace: {
        id: string;
    };
    span: {
        id: string;
    };
}
export interface OtelSpanLink {
    span_id: Array<string | undefined>;
    trace_id: Array<string | undefined>;
}
