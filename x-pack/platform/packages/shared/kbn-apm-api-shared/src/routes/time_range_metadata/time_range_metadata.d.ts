import { z } from '@kbn/zod/v4';
import type { TimeRangeMetadata } from '@kbn/apm-types';
export type TimeRangeMetadataResponse = TimeRangeMetadata;
export declare const timeRangeMetadataRoute: {
    endpoint: "GET /internal/apm/time_range_metadata";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            useSpanName: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TimeRangeMetadata>;
