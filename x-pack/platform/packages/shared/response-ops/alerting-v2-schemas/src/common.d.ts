import { z } from '@kbn/zod/v4';
declare const durationSchema: z.ZodString;
/**
 * Shared schema for tag arrays used across alerting v2 (rule metadata, action policies,
 * alert tag actions, tag filters). Each tag is up to 128 characters. Up to 20 tags allowed.
 */
declare const tagsSchema: z.ZodArray<z.ZodString>;
/** Make a schema optional while preserving its `.describe()` metadata. */
declare const optionalWithDescription: <T extends z.ZodType>(schema: T) => z.ZodOptional<T>;
export { durationSchema, tagsSchema, optionalWithDescription };
