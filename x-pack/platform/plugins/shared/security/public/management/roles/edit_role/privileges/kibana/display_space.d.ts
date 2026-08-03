import type { Space } from '@kbn/spaces-plugin/public';
import { ALL_SPACES_ID } from '../../../../../../common/constants';
/**
 * The synthetic "all spaces" (`*`) entry shown throughout role management.
 */
export interface AllSpacesEntry {
    id: typeof ALL_SPACES_ID;
    name: string;
    color?: string;
    initials?: string;
    disabledFeatures: string[];
}
/**
 * A space displayed in role management: either a real {@link Space} or the
 * synthetic {@link AllSpacesEntry} "all spaces" pseudo-entry.
 */
export type DisplaySpace = Space | AllSpacesEntry;
/** Type guard narrowing a {@link DisplaySpace} to the "all spaces" pseudo-entry. */
export declare const isAllSpacesEntry: (space: DisplaySpace) => space is AllSpacesEntry;
/** The single source of truth for the "all spaces" pseudo-entry display fields. */
export declare const createAllSpacesEntry: (name: string) => AllSpacesEntry;
