import { z } from '@kbn/zod/v4';
declare const durationSchema: z.ZodString;
/**
 * Shared schema for tag arrays used across alerting v2 (rule metadata, action policies,
 * alert tag actions, tag filters). Each tag is up to 128 characters. Up to 20 tags allowed.
 */
declare const tagsSchema: z.ZodArray<z.ZodString>;
export { durationSchema, tagsSchema };
