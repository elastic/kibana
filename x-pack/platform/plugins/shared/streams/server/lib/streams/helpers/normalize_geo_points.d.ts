export interface GeoPointValue {
    lat: unknown;
    lon: unknown;
}
export declare function normalizeGeoPointsInObject(obj: Record<string, unknown>, geoPointFields: Set<string>): Record<string, unknown>;
export declare function buildGeoPointExistsQuery(fieldName: string): {
    bool: {
        should: ({
            exists: {
                field: string;
            };
            bool?: undefined;
        } | {
            bool: {
                filter: {
                    exists: {
                        field: string;
                    };
                }[];
            };
            exists?: undefined;
        })[];
        minimum_should_match: number;
    };
};
export declare function detectGeoPointPatternsFromDocuments(documents: Array<Record<string, unknown>>): Set<string>;
export declare function rebuildGeoPointsFromFlattened(flattenedSource: Record<string, unknown>, fieldDefinitionKeys: string[], geoPointFields: Set<string>): Record<string, unknown>;
export declare function collectFieldsWithGeoPoints(fields: Record<string, {
    type?: string;
}>, mappedFields: Set<string>, geoPointFields: Set<string>): void;
