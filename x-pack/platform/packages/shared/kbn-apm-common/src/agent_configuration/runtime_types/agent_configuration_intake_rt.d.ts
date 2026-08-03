import { z } from '@kbn/zod/v4';
export declare const serviceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Every value must be a string, and known settings additionally pass their
 * per-setting validation.
 */
export declare const settingsSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const agentConfigurationIntakeSchema: z.ZodObject<{
    agent_name: z.ZodOptional<z.ZodString>;
    service: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        environment: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    settings: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
