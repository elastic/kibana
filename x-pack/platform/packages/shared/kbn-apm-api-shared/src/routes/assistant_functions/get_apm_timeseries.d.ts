import { z } from '@kbn/zod/v4';
import { type ApmTimeseries } from '@kbn/apm-types';
export interface GetApmTimeseriesResponse {
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
}
export declare const getApmTimeseriesRoute: {
    endpoint: "POST /internal/apm/assistant/get_apm_timeseries";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            stats: z.ZodArray<z.ZodObject<{
                'service.name': z.ZodString;
                title: z.ZodString;
                timeseries: z.ZodUnion<readonly [z.ZodObject<{
                    name: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionThroughput>, z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionFailureRate>]>;
                    'transaction.type': z.ZodOptional<z.ZodString>;
                    'transaction.name': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>, z.ZodObject<{
                    name: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanThroughput>, z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanFailureRate>, z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanLatency>]>;
                    'span.destination.service.resource': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>, z.ZodObject<{
                    name: z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionLatency>;
                    function: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                    'transaction.type': z.ZodOptional<z.ZodString>;
                    'transaction.name': z.ZodOptional<z.ZodString>;
                }, z.core.$strip>, z.ZodObject<{
                    name: z.ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.errorEventRate>;
                }, z.core.$strip>]>;
                filter: z.ZodOptional<z.ZodString>;
                offset: z.ZodOptional<z.ZodString>;
                'service.environment': z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            start: z.ZodString;
            end: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<GetApmTimeseriesResponse>;
