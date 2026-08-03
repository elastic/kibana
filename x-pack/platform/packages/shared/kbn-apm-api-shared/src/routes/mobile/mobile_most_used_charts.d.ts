import { z } from '@kbn/zod/v4';
import { type MobilePropertyType } from '@kbn/apm-types';
export type MobileMostUsedChartResponse = Array<{
    key: MobilePropertyType;
    options: Array<{
        key: string | number;
        docCount: number;
    }>;
}>;
export interface MobileMostUsedChartsRouteResponse {
    mostUsedCharts: Array<{
        key: MobilePropertyType;
        options: MobileMostUsedChartResponse[number]['options'];
    }>;
}
export declare const mobileMostUsedChartsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/most_used_charts";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileMostUsedChartsRouteResponse>;
