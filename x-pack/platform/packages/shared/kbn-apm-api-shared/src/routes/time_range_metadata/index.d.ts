export declare const timeRangeMetadataRouteDefinitions: {
    timeRangeMetadata: {
        endpoint: "GET /internal/apm/time_range_metadata";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                useSpanName: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").TimeRangeMetadata>;
};
export type { TimeRangeMetadataResponse } from './time_range_metadata';
