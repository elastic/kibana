import type { FilterSpecification } from '@kbn/mapbox-gl';
import type { Timeslice } from '../../../common/descriptor_types';
export interface TimesliceMaskConfig {
    timesliceMaskField: string;
    timeslice: Timeslice;
}
export declare const EXCLUDE_CENTROID_FEATURES: FilterSpecification;
export declare function getFillFilterExpression(joinFilter?: FilterSpecification, timesliceMaskConfig?: TimesliceMaskConfig): FilterSpecification;
export declare function getLineFilterExpression(joinFilter?: FilterSpecification, timesliceMaskConfig?: TimesliceMaskConfig): FilterSpecification;
export declare function getPointFilterExpression(isSourceGeoJson: boolean, isESVectorTileSource: boolean, joinFilter?: FilterSpecification, timesliceMaskConfig?: TimesliceMaskConfig): FilterSpecification;
export declare function getLabelFilterExpression(isSourceGeoJson: boolean, isESVectorTileSource: boolean, joinFilter?: FilterSpecification, timesliceMaskConfig?: TimesliceMaskConfig): FilterSpecification;
