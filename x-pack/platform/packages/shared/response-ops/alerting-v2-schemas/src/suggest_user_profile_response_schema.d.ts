import { z } from '@kbn/zod/v4';
export declare const suggestUserProfilesResponseSchema: z.ZodArray<z.ZodObject<{
    uid: z.ZodString;
    user: z.ZodObject<{
        username: z.ZodString;
        full_name: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    avatar: z.ZodOptional<z.ZodObject<{
        initials: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
