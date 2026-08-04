import type { FeatureCollection } from 'geojson';
import type { ESQLSearchResponse } from '@kbn/es-types';
export declare function convertToGeoJson(resp: ESQLSearchResponse): FeatureCollection;
