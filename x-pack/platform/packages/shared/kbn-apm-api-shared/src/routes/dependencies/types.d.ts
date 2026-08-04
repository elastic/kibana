import { z } from '@kbn/zod/v4';
export declare const dependencyChartQuerySchema: z.ZodObject<{
    dependencyName: z.ZodString;
    spanName: z.ZodString;
    searchServiceDestinationMetrics: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
    start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
    end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
    kuery: z.ZodString;
    environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
    offset: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
