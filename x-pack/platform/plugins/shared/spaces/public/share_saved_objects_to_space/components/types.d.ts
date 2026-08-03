import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
export interface InternalLegacyUrlAliasTarget extends LegacyUrlAliasTarget {
    /**
     * We could potentially have an alias for a space that does not exist; in that case, we may need disable it, but we don't want to show it
     * in the UI.
     */
    spaceExists: boolean;
}
