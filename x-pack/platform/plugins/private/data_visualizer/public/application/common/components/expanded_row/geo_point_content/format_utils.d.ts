import type { Feature, Point } from 'geojson';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
export declare const convertWKTGeoToLonLat: (value: string | number) => {
    lat: number;
    lon: number;
} | undefined;
export declare const DEFAULT_POINT_COLOR: string;
export declare const getGeoPointsLayer: (features: Array<Feature<Point>>, pointColor?: string) => VectorLayerDescriptor;
