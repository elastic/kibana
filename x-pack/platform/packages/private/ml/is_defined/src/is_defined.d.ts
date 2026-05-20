/**
 * Checks whether the supplied argument is not `undefined` and not `null`.
 *
 * @param argument - argument to check whether it is defined.
 * @returns boolean
 */
export declare function isDefined<T>(argument: T | undefined | null): argument is T;
