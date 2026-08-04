import type { DataView } from '@kbn/data-plugin/common';
import type { ESQLColumn } from '@kbn/es-types';
export declare const ESQL_GEO_POINT_TYPE = "geo_point";
export declare const ESQL_GEO_SHAPE_TYPE = "geo_shape";
export declare function isGeometryColumn(column: ESQLColumn): boolean;
export declare function verifyGeometryColumn(columns: ESQLColumn[]): void;
export declare function getESQLMeta(esql: string): Promise<{
    dateFields: string[];
    geoFields: string[];
    columns: ESQLColumn[];
    adhocDataViewId: string;
}>;
export declare function getFields(dataView: DataView): {
    dateFields: string[];
    geoFields: string[];
};
