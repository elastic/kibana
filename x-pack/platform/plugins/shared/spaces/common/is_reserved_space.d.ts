import type { Space } from '.';
/**
 * Returns whether the given Space is reserved or not.
 *
 * @param space the space
 * @returns boolean
 */
export declare function isReservedSpace(space?: Pick<Space, '_reserved'> | null): boolean;
