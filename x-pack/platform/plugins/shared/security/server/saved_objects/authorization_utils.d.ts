import type { AuthorizationTypeEntry, AuthorizationTypeMap } from '@kbn/core-saved-objects-server';
/**
 * Helper function that, given an `CheckAuthorizationResult`, checks to see what spaces the user is authorized to perform a given action for
 * the given object type.
 *
 * Only exported for unit testing purposes.
 *
 * @param {string} objectType the object type to check.
 * @param {T} action the action to check.
 * @param {AuthorizationTypeMap<A>} typeMap the typeMap from an CheckAuthorizationResult.
 */
export declare function getEnsureAuthorizedActionResult<A extends string>(objectType: string, action: A, typeMap: AuthorizationTypeMap<A>): AuthorizationTypeEntry;
/**
 * Helper function that, given an `CheckAuthorizationResult`, ensures that the user is authorized to perform a given action for the given
 * object type in the given spaces.
 *
 * @param objectType The object type to check.
 * @param action The action to check.
 * @param spaces The spaces to check.
 * @param typeMap The typeMap from a CheckAuthorizationResult.
 */
export declare function isAuthorizedInAllSpaces<T extends string>(objectType: string, action: T, spaces: string[], typeMap: AuthorizationTypeMap<T>): boolean;
