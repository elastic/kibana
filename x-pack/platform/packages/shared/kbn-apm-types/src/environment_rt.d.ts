import { z } from '@kbn/zod/v4';
export declare const environmentStringSchema: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
export declare const environmentSchema: z.ZodObject<{
    environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
}, z.core.$strip>;
export type Environment = z.infer<typeof environmentSchema>['environment'];
