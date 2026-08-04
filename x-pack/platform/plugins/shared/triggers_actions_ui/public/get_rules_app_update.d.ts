import type { AppUpdatableFields, Capabilities } from '@kbn/core/public';
/**
 * The standalone `rules` app's nav link capability isn't owned by any feature, so it stays enabled
 * for everyone. Gate it on the Rules management capability instead, so users without rules access
 * (e.g. `stackAlertsOnly`) can't reach it via the solution side nav or direct navigation.
 */
export declare const getRulesAppUpdate: (capabilities: Capabilities) => Pick<AppUpdatableFields, "status" | "visibleIn">;
