/**
 * @internal
 */
export interface TaggingUsageData {
    usedTags: number;
    taggedObjects: number;
    types: Record<string, ByTypeTaggingUsageData>;
}
/**
 * @internal
 */
export interface ByTypeTaggingUsageData {
    usedTags: number;
    taggedObjects: number;
}
