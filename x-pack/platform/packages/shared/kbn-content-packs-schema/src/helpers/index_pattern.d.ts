import type { ContentPackSavedObject } from '../models';
export declare const INDEX_PLACEHOLDER = "<stream_name_placeholder>";
export declare const isIndexPlaceholder: (index: string) => boolean;
export declare function findConfiguration(savedObject: ContentPackSavedObject): {
    patterns: string[];
    fields: Record<string, {
        type: string;
    }>;
};
export declare function replaceIndexPatterns(savedObject: ContentPackSavedObject, patternReplacements: Record<string, string>): ContentPackSavedObject;
