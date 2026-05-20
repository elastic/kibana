import type { ISavedObjectTypeRegistry } from '@kbn/core/server';
export declare const getDescriptorNamespace: (typeRegistry: ISavedObjectTypeRegistry, type: string, namespace?: string | string[]) => string | undefined;
/**
 * Ensure that a namespace is always in its namespace ID representation.
 * This allows `'default'` to be used interchangeably with `undefined`.
 */
export declare const normalizeNamespace: (namespace?: string) => string | undefined;
