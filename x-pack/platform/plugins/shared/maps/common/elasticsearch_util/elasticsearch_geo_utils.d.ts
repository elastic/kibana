import type { TopLeftBottomRightGeoBounds } from '@elastic/elasticsearch/lib/api/types';
import type { FeatureCollection, Geometry, Polygon, Point, Position } from 'geojson';
import type { BBox } from '@turf/helpers';
import { ES_GEO_FIELD_TYPE } from '../constants';
import type { MapExtent } from '../descriptor_types';
type Coordinates = Position | Position[] | Position[][] | Position[][][];
interface ESGeometry {
    type: string;
    coordinates: Coordinates;
}
/**
 * Converts Elasticsearch search results into GeoJson FeatureCollection
 *
 * @param {array} hits Elasticsearch search response hits array
 * @param {function} flattenHit Method to flatten hits._source and hits.fields into properties object.
 *   Should just be IndexPattern.flattenHit but wanted to avoid coupling this method to IndexPattern.
 * @param {string} geoFieldName Geometry field name
 * @param {string} geoFieldType Geometry field type ["geo_point", "geo_shape"]
 * @returns {number}
 */
export declare function hitsToGeoJson(hits: Array<Record<string, unknown>>, flattenHit: (elasticSearchHit: Record<string, unknown>) => Record<string, unknown>, geoFieldName: string, geoFieldType: ES_GEO_FIELD_TYPE, epochMillisFields: string[]): FeatureCollection;
export declare function geoPointToGeometry(value: Point[] | Point | undefined, accumulator: Geometry[]): void;
export declare function geoShapeToGeometry(value: ESGeometry | ESGeometry[] | undefined, accumulator: Geometry[]): void;
export declare function makeESBbox({ maxLat, maxLon, minLat, minLon, }: MapExtent): TopLeftBottomRightGeoBounds;
export declare function roundCoordinates(coordinates: Coordinates): void;
export declare function getBoundingBoxGeometry(geometry: Geometry): Polygon;
export declare function formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon }: MapExtent): Polygon;
export declare function clampToLatBounds(lat: number): number;
export declare function clampToLonBounds(lon: number): number;
export declare function clamp(val: number, min: number, max: number): number;
export declare function scaleBounds(bounds: MapExtent, scaleFactor: number): MapExtent;
export declare function turfBboxToBounds(turfBbox: BBox): MapExtent;
export {};
