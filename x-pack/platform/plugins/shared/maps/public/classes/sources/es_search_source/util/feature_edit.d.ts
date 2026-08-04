import type { Geometry, Position } from 'geojson';
export declare const addFeatureToIndex: (indexName: string, geometry: Geometry | Position[], path: string, defaultFields: Record<string, Record<string, string>>) => Promise<unknown>;
export declare const deleteFeatureFromIndex: (indexName: string, featureId: string) => Promise<unknown>;
export declare const getMatchingIndexes: (indexPattern: string) => Promise<{
    success: boolean;
    matchingIndexes: string[];
}>;
export declare const getIsDrawLayer: (index: string) => Promise<{
    success: boolean;
    isDrawingIndex: boolean;
}>;
