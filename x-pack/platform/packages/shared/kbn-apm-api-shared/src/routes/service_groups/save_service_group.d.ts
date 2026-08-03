import { z } from '@kbn/zod/v4';
import type { SavedServiceGroup } from '@kbn/apm-types';
export type SaveServiceGroupResponse = SavedServiceGroup;
export declare const serviceGroupSaveRoute: {
    endpoint: "POST /internal/apm/service-group";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            serviceGroupId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        body: z.ZodObject<{
            groupName: z.ZodString;
            kuery: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SavedServiceGroup>;
