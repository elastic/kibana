import type { FeatureCollection } from 'geojson';
export declare function convertToGeoJson(esResponse: any, entitySplitFieldName: string): {
    featureCollection: FeatureCollection;
    numTrimmedTracks: number;
};
