import { z } from '@kbn/zod/v4';
export declare const deleteSourceMapRoute: {
    endpoint: "DELETE /api/apm/sourcemaps/{id} 2023-10-31";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
