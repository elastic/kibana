import type { ContentPackEntry, ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
export declare function hasSelectedObjects(includedObjects: ContentPackIncludedObjects): boolean;
export declare function containsAssets(streams: ContentPackStream[]): boolean;
export declare function containsMappings(streams: ContentPackStream[]): boolean;
export declare function isEmptyContentPack(entries: ContentPackEntry[]): boolean;
