import type { z } from '@kbn/zod/v4';
/**
 * A string that does not contain only whitespace characters
 */
export declare const NonEmptyString: z.ZodString;
export type NonEmptyString = z.infer<typeof NonEmptyString>;
/**
 * An identifier containing only alphanumeric characters and underscores
 */
export declare const SafeIdentifier: z.ZodString;
export type SafeIdentifier = z.infer<typeof SafeIdentifier>;
/**
 * A semantic version string (e.g. 1.0.0 or 1.0.0-beta).
 */
export declare const SemVer: z.ZodString;
export type SemVer = z.infer<typeof SemVer>;
/**
 * A universally unique identifier
 */
export declare const UUID: z.ZodString;
export type UUID = z.infer<typeof UUID>;
