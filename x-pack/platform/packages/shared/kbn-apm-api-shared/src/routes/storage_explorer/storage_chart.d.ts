import { z } from '@kbn/zod/v4';
export type SizeTimeseriesResponse = Array<{
    serviceName: string;
    timeseries: Array<{
        x: number;
        y: number;
    }>;
}>;
export interface StorageChartRouteResponse {
    storageTimeSeries: SizeTimeseriesResponse;
}
export declare const storageChartRoute: {
    endpoint: "GET /internal/apm/storage_chart";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            indexLifecyclePhase: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
            probability: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<StorageChartRouteResponse>;
