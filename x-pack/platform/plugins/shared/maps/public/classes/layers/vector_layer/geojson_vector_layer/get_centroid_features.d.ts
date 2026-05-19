import type { Feature, FeatureCollection } from 'geojson';
export declare function getCentroidFeatures(featureCollection: FeatureCollection): Feature[];
export declare function getCentroid(feature: Feature): Feature | null;
