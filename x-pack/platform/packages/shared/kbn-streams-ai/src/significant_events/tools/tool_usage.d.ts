export interface ToolUsage {
    calls: number;
    failures: number;
    latency_ms: number;
}
export interface SignificantEventsToolUsage {
    get_stream_features: ToolUsage;
    add_queries: ToolUsage;
}
export declare const createDefaultSignificantEventsToolUsage: () => SignificantEventsToolUsage;
