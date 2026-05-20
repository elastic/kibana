import type * as t from 'io-ts';
export declare enum LatencyAggregationType {
    avg = "avg",
    p99 = "p99",
    p95 = "p95"
}
export declare const latencyAggregationTypeRt: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
