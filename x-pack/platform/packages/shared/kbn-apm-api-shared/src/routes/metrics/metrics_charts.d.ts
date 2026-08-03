import { z } from '@kbn/zod/v4';
import type { Coordinate, YUnit, ChartType } from '@kbn/apm-types';
export interface FetchAndTransformMetrics {
    title: string;
    key: string;
    yUnit: YUnit;
    series: Array<{
        title: string;
        key: string;
        type: ChartType;
        overallValue: number;
        data: Coordinate[];
    }>;
    description?: string;
}
export type GenericMetricsChart = FetchAndTransformMetrics;
export interface MetricsChartsResponse {
    charts: FetchAndTransformMetrics[];
}
export declare const metricsChartsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/charts";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            agentName: z.ZodString;
            serviceNodeName: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MetricsChartsResponse>;
