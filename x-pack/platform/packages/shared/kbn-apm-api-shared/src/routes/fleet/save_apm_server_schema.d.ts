import { z } from '@kbn/zod/v4';
export declare const saveApmServerSchemaRoute: {
    endpoint: "POST /api/apm/fleet/apm_server_schema 2023-10-31";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            schema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
