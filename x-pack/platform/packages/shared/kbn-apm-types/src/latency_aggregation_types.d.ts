import { z } from '@kbn/zod/v4';
export declare enum LatencyAggregationType {
    avg = "avg",
    p99 = "p99",
    p95 = "p95"
}
export declare const latencyAggregationTypeSchema: z.ZodUnion<readonly [z.ZodLiteral<LatencyAggregationType.avg>, z.ZodLiteral<LatencyAggregationType.p95>, z.ZodLiteral<LatencyAggregationType.p99>]>;
