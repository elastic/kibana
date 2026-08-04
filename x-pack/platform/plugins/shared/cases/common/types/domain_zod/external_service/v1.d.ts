import { z } from '@kbn/zod/v4';
export declare const ExternalServiceBasicSchema: z.ZodObject<{
    connector_name: z.ZodString;
    external_id: z.ZodString;
    external_title: z.ZodString;
    external_url: z.ZodString;
    pushed_at: z.ZodString;
    pushed_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ExternalServiceSchema: z.ZodObject<{
    connector_name: z.ZodString;
    external_id: z.ZodString;
    external_title: z.ZodString;
    external_url: z.ZodString;
    pushed_at: z.ZodString;
    pushed_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    connector_id: z.ZodString;
}, z.core.$strip>;
export type ExternalService = z.infer<typeof ExternalServiceSchema>;
