import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare const INDEX_PATTERN_SAVED_OBJECT_TYPE = "index-pattern";
export declare const indexPatternTypes: ("metrics" | "logs")[];
export declare function getIndexPatternSavedObjects(): {
    id: string;
    type: string;
    typeMigrationVersion: string;
    attributes: {
        title: string;
        timeFieldName: string;
        allowNoIndex: boolean;
    };
}[];
export declare function makeManagedIndexPatternsGlobal(savedObjectsClient: SavedObjectsClientContract): Promise<import("@kbn/core/server").SavedObjectsUpdateObjectsSpacesResponse[]>;
export declare function removeUnusedIndexPatterns(savedObjectsClient: SavedObjectsClientContract): Promise<never[] | undefined>;
