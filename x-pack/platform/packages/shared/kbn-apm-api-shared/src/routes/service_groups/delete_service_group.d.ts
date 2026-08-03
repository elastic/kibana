import { z } from '@kbn/zod/v4';
export declare const serviceGroupDeleteRoute: {
    endpoint: "DELETE /internal/apm/service-group";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceGroupId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
