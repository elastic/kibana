import type { z } from '@kbn/zod/v4';
export declare function taskActionSchema<T extends z.ZodRawShape>(scheduleParams: T): z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"schedule">;
} & T extends infer T_1 ? { -readonly [P in keyof T_1]: T_1[P]; } : never, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"cancel">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"acknowledge">;
}, z.core.$strip>], "action">;
