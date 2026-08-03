import { z } from '@kbn/zod/v4';
export declare const createOrUpdateAgentConfigurationRoute: {
    endpoint: "PUT /api/apm/settings/agent-configuration 2023-10-31";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            overwrite: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, z.core.$strip>>;
        body: z.ZodObject<{
            agent_name: z.ZodOptional<z.ZodString>;
            service: z.ZodObject<{
                name: z.ZodOptional<z.ZodString>;
                environment: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            settings: z.ZodRecord<z.ZodString, z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
