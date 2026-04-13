import React from 'react';
import type { ContentPackEntry, ContentPackIncludedObjects } from '@kbn/content-packs-schema';
export declare function ContentPackObjectsList({ objects, onSelectionChange, significantEventsAvailable, }: {
    objects: ContentPackEntry[];
    onSelectionChange: (objects: ContentPackIncludedObjects) => void;
    significantEventsAvailable: boolean;
}): React.JSX.Element | null;
