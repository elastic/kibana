import { z } from '@kbn/zod/v4';
import { AggregationType, type Coordinate } from '@kbn/apm-types';
export declare const alertParamsSchema: z.ZodObject<{
    aggregationType: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<AggregationType.Avg>, z.ZodLiteral<AggregationType.P95>, z.ZodLiteral<AggregationType.P99>]>>;
    serviceName: z.ZodOptional<z.ZodString>;
    errorGroupingKey: z.ZodOptional<z.ZodString>;
    transactionType: z.ZodOptional<z.ZodString>;
    transactionName: z.ZodOptional<z.ZodString>;
    interval: z.ZodString;
    groupBy: z.ZodOptional<z.ZodArray<z.ZodString>>;
    searchConfiguration: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodObject<{
        query: z.ZodObject<{
            query: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>]>;
            language: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
    start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
    end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
}, z.core.$strip>;
export type AlertParams = z.infer<typeof alertParamsSchema>;
export interface PreviewChartResponseItem {
    name: string;
    data: Coordinate[];
}
export interface PreviewChartResponse {
    series: PreviewChartResponseItem[];
    totalGroups: number;
}
