import type { Feature } from 'geojson';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportDoc } from '@kbn/file-upload-common';
export declare function createChunks(features: Feature[], geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE, maxChunkCharCount: number): ImportDoc[][];
export declare function toEsDoc(feature: Feature, geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE): {
    geometry: import("geojson").Position | import("geojson").Geometry;
};
