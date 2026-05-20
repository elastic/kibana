import type { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
import { type FieldDefinition } from '@kbn/streams-schema';
export declare function withoutRootPrefix(root: string, name: string): string;
export declare function withRootPrefix(root: string, name: string): string;
export declare function includedObjectsFor(stream: string, include: ContentPackIncludedObjects): ContentPackIncludedObjects;
export declare function filterQueries(entry: ContentPackStream, include: ContentPackIncludedObjects): import("@kbn/streams-schema").StreamQuery[];
export declare function filterRouting(entry: ContentPackStream, include: ContentPackIncludedObjects): import("@kbn/streams-schema").RoutingDefinition[];
export declare function getFields(entry: ContentPackStream, include: ContentPackIncludedObjects): FieldDefinition;
export declare function withoutBaseFields(fields: FieldDefinition): FieldDefinition;
/**
 * Strips inherited field metadata (`from`, `alias_for`) from field definitions.
 * Used when exporting content packs to produce clean FieldDefinition objects.
 */
export declare function withoutInheritedFieldMetadata(fields: FieldDefinition): FieldDefinition;
/**
 * Derives the original root stream name from a content pack by matching
 * relative stream names against absolute FROM clause indices in queries.
 */
export declare function deriveSourceRoot(streams: ContentPackStream[]): string | undefined;
export declare function scopeContentPackStreams({ root, streams, }: {
    root: string;
    streams: ContentPackStream[];
}): ContentPackStream[];
export declare function scopeIncludedObjects({ root, include, }: {
    root: string;
    include: ContentPackIncludedObjects;
}): ContentPackIncludedObjects;
