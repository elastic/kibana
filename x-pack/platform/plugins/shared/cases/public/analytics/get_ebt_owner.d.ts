/**
 * Resolves the case context's owner into the value reported on EBT events, falling back to
 * `'unknown'` when the owner is missing or is not a registered solution.
 */
export declare const getEbtOwner: (owner: string[]) => string;
