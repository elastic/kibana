import { z } from '@kbn/zod/v4';
import type { ChangePointType } from '@kbn/es-types/src';
import { LatencyAggregationType } from './latency_aggregation_types';
export declare enum ApmTimeseriesType {
    transactionThroughput = "transaction_throughput",
    transactionLatency = "transaction_latency",
    transactionFailureRate = "transaction_failure_rate",
    exitSpanThroughput = "exit_span_throughput",
    exitSpanLatency = "exit_span_latency",
    exitSpanFailureRate = "exit_span_failure_rate",
    errorEventRate = "error_event_rate"
}
export declare const getApmTimeseriesRt: z.ZodObject<{
    stats: z.ZodArray<z.ZodObject<{
        'service.name': z.ZodString;
        title: z.ZodString;
        timeseries: z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodUnion<readonly [z.ZodLiteral<ApmTimeseriesType.transactionThroughput>, z.ZodLiteral<ApmTimeseriesType.transactionFailureRate>]>;
            'transaction.type': z.ZodOptional<z.ZodString>;
            'transaction.name': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodUnion<readonly [z.ZodLiteral<ApmTimeseriesType.exitSpanThroughput>, z.ZodLiteral<ApmTimeseriesType.exitSpanFailureRate>, z.ZodLiteral<ApmTimeseriesType.exitSpanLatency>]>;
            'span.destination.service.resource': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodLiteral<ApmTimeseriesType.transactionLatency>;
            function: z.ZodUnion<readonly [z.ZodLiteral<LatencyAggregationType.avg>, z.ZodLiteral<LatencyAggregationType.p95>, z.ZodLiteral<LatencyAggregationType.p99>]>;
            'transaction.type': z.ZodOptional<z.ZodString>;
            'transaction.name': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodLiteral<ApmTimeseriesType.errorEventRate>;
        }, z.core.$strip>]>;
        filter: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodString>;
        'service.environment': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export interface TimeseriesChangePoint {
    change_point?: number | undefined;
    r_value?: number | undefined;
    trend?: string | undefined;
    p_value?: number;
    date: string | undefined;
    type: ChangePointType;
}
export interface ApmTimeseries {
    stat: z.infer<typeof getApmTimeseriesRt>['stats'][number];
    group: string;
    id: string;
    data: Array<{
        x: number;
        y: number | null;
    }>;
    value: number | null;
    start: number;
    end: number;
    unit: string;
    changes: TimeseriesChangePoint[];
}
