import { VECTOR_SHAPE_TYPE } from '../../../../../common/constants';
import type { DynamicStylePropertyOptions, RangeFieldMeta, StyleMetaDescriptor, TileMetaFeature } from '../../../../../common/descriptor_types';
import type { PropertiesMap } from '../../../../../common/elasticsearch_util';
import type { IDynamicStyleProperty } from '../../../styles/vector/properties/dynamic_style_property';
export declare function pluckStyleMeta(metaFeatures: TileMetaFeature[], joinPropertiesMap: PropertiesMap | undefined, supportedShapeTypes: VECTOR_SHAPE_TYPE[], dynamicProperties: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>): Promise<StyleMetaDescriptor>;
export declare function pluckOrdinalStyleMeta(property: IDynamicStyleProperty<DynamicStylePropertyOptions>, metaFeatures: TileMetaFeature[], joinPropertiesMap: PropertiesMap | undefined): RangeFieldMeta | null;
