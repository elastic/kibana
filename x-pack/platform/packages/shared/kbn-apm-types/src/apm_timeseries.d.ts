import * as t from 'io-ts';
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
export declare const getApmTimeseriesRt: t.TypeC<{
    stats: t.ArrayC<t.IntersectionC<[t.TypeC<{
        'service.name': t.StringC;
        title: t.StringC;
        timeseries: t.UnionC<[t.IntersectionC<[t.TypeC<{
            name: t.UnionC<[t.LiteralC<ApmTimeseriesType.transactionThroughput>, t.LiteralC<ApmTimeseriesType.transactionFailureRate>]>;
        }>, t.PartialC<{
            'transaction.type': t.StringC;
            'transaction.name': t.StringC;
        }>]>, t.IntersectionC<[t.TypeC<{
            name: t.UnionC<[t.LiteralC<ApmTimeseriesType.exitSpanThroughput>, t.LiteralC<ApmTimeseriesType.exitSpanFailureRate>, t.LiteralC<ApmTimeseriesType.exitSpanLatency>]>;
        }>, t.PartialC<{
            'span.destination.service.resource': t.StringC;
        }>]>, t.IntersectionC<[t.TypeC<{
            name: t.LiteralC<ApmTimeseriesType.transactionLatency>;
            function: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
        }>, t.PartialC<{
            'transaction.type': t.StringC;
            'transaction.name': t.StringC;
        }>]>, t.TypeC<{
            name: t.LiteralC<ApmTimeseriesType.errorEventRate>;
        }>]>;
    }>, t.PartialC<{
        filter: t.StringC;
        offset: t.StringC;
        'service.environment': t.StringC;
    }>]>>;
    start: t.StringC;
    end: t.StringC;
}>;
export interface TimeseriesChangePoint {
    change_point?: number | undefined;
    r_value?: number | undefined;
    trend?: string | undefined;
    p_value?: number;
    date: string | undefined;
    type: ChangePointType;
}
export interface ApmTimeseries {
    stat: t.TypeOf<typeof getApmTimeseriesRt>['stats'][number];
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
