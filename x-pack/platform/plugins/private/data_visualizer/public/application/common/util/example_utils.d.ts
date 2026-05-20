import type { GeoPointExample, LatLongExample } from '../../../../common/types/field_request_config';
export declare function isGeoPointExample(arg: unknown): arg is GeoPointExample;
export declare function isLonLatExample(arg: unknown): arg is LatLongExample;
export declare function getUniqGeoOrStrExamples(examples: Array<string | GeoPointExample | LatLongExample | object> | undefined, maxExamples?: number): Array<string | GeoPointExample | LatLongExample | object>;
