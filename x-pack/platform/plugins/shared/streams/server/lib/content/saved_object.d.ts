import type { ContentPackIncludedObjects, ContentPackSavedObject, ContentPackSavedObjectLinks } from '@kbn/content-packs-schema';
import type { SavedObject } from '@kbn/core/server';
export declare function prepareSOForExport({ savedObjects, source, replacedPatterns, }: {
    savedObjects: SavedObject[];
    source: string;
    replacedPatterns?: string[];
}): ContentPackSavedObject[];
export declare function prepareSOForImport({ savedObjects, include, target, links, }: {
    savedObjects: SavedObject[];
    include: ContentPackIncludedObjects;
    target: string;
    links: ContentPackSavedObjectLinks;
}): ContentPackSavedObject[];
export declare function savedObjectLinks(savedObjects: ContentPackSavedObject[], existingLinks: ContentPackSavedObjectLinks): ContentPackSavedObjectLinks;
export declare function referenceManagedIndexPattern(savedObjects: ContentPackSavedObject[]): boolean;
