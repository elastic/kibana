import React from 'react';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
export interface TagBadgesProps {
    references: SavedObjectReference[] | undefined;
    taggingApi: SavedObjectsTaggingApi | undefined;
    /** Used to namespace `data-test-subj` attributes so multiple cards don't collide. */
    id: string;
}
export declare const TagBadges: React.NamedExoticComponent<TagBadgesProps>;
