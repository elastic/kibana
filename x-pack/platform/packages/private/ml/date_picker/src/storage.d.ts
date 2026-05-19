/**
 * Local storage options to include/exclude frozen tier.
 */
export declare const FROZEN_TIER_PREFERENCE: {
    readonly EXCLUDE: "exclude-frozen";
    readonly INCLUDE: "include-frozen";
};
/**
 * Union type of `FROZEN_TIER_PREFERENCE` options.
 */
export type FrozenTierPreference = (typeof FROZEN_TIER_PREFERENCE)[keyof typeof FROZEN_TIER_PREFERENCE];
