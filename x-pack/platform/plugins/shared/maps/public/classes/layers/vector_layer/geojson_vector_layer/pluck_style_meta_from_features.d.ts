import type { Feature } from 'geojson';
import { VECTOR_SHAPE_TYPE } from '../../../../../common/constants';
import type { Category, DynamicStylePropertyOptions, StyleMetaDescriptor } from '../../../../../common/descriptor_types';
import type { IDynamicStyleProperty } from '../../../styles/vector/properties/dynamic_style_property';
export declare function pluckStyleMetaFromFeatures(features: Feature[], supportedShapeTypes: VECTOR_SHAPE_TYPE[], dynamicProperties: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>): Promise<StyleMetaDescriptor>;
export declare function pluckCategoricalStyleMetaFromFeatures(property: IDynamicStyleProperty<DynamicStylePropertyOptions>, features: Feature[]): Category[];
export declare function isOnlySingleFeatureType(featureType: VECTOR_SHAPE_TYPE, supportedShapeTypes: VECTOR_SHAPE_TYPE[], hasFeatureType: {
    [key in keyof typeof VECTOR_SHAPE_TYPE]: boolean;
}): boolean;
