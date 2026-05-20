export * from './dissect_patterns';
export * from './grok_patterns';
export * from './grok_to_regex';
export * from './painless_field_access';
export * from './painless_encoding';
import type { z, ZodObject } from '@kbn/zod/v4';
export type RenameFields<T, Renames extends {
    [K in keyof Renames]: K extends keyof T ? string : never;
}> = Omit<T, keyof Renames> & {
    [K in keyof Renames as Renames[K]]: K extends keyof T ? T[K] : never;
};
export type RenameFieldsAndRemoveAction<T, Renames extends {
    [K in keyof Renames]: K extends keyof T ? string : never;
}> = Omit<RenameFields<T, Renames>, 'action'>;
/** Zod object shape: record of string keys to Zod types */
type ZodObjectShape = Record<string, z.ZodType>;
/**
 * Zod helper to rename multiple fields in a Zod object schema.
 */
export declare function zodRenameFields<T extends ZodObject<ZodObjectShape>, Renames extends Record<string, string>>(schema: T, renames: Renames): ZodObject<ZodObjectShape>;
/**
 * Zod helper to rename fields and remove the 'action' property.
 */
export declare function zodRenameFieldsAndRemoveAction<T extends ZodObject<ZodObjectShape>, Renames extends Record<string, string>>(schema: T, renames: Renames): ZodObject<ZodObjectShape>;
