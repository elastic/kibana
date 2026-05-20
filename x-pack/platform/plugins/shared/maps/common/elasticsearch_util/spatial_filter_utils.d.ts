import type { GeoShapeRelation, QueryDslFieldLookup, QueryDslGeoBoundingBoxQuery, QueryDslGeoDistanceQuery, QueryDslGeoShapeQuery } from '@elastic/elasticsearch/lib/api/types';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import type { Filter } from '@kbn/es-query';
import type { MapExtent } from '../descriptor_types';
type GeoFilter = Filter & {
    geo_bounding_box?: QueryDslGeoBoundingBoxQuery;
    geo_distance?: QueryDslGeoDistanceQuery;
    geo_grid?: {
        [geoFieldName: string]: {
            geohex?: string;
            geotile?: string;
        };
    };
    geo_shape?: QueryDslGeoShapeQuery;
};
export declare function createExtentFilter(mapExtent: MapExtent, geoFieldNames: string[]): GeoFilter;
export declare function buildGeoShapeFilter({ preIndexedShape, geometry, geometryLabel, geoFieldNames, relation, }: {
    preIndexedShape?: QueryDslFieldLookup | null;
    geometry?: MultiPolygon | Polygon;
    geometryLabel: string;
    geoFieldNames: string[];
    relation?: GeoShapeRelation;
}): GeoFilter;
export declare function buildGeoGridFilter({ geoFieldNames, gridId, isHex, }: {
    geoFieldNames: string[];
    gridId: string;
    isHex: boolean;
}): GeoFilter;
export declare function createDistanceFilterWithMeta({ alias, distanceKm, geoFieldNames, point, }: {
    alias?: string;
    distanceKm: number;
    geoFieldNames: string[];
    point: Position;
}): GeoFilter;
export declare function extractFeaturesFromFilters(filters: GeoFilter[]): Feature[];
export {};
