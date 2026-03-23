/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type {
  colorDynamicSchema,
  colorStaticSchema,
  colorSchema,
  colorDynamicOptions,
  colorStaticOptions,
  ordinalColorStop,
  categoryColorStop,
} from './color_schemas';
import type {
  iconDynamicOptions,
  iconSchema,
  iconStaticOptions,
  iconStop,
  orientationDynamicOptions,
  orientationSchema,
  orientationStaticOptions,
  sizeDynamicOptions,
  sizeSchema,
  sizeStaticOptions,
  symbolizeAsOptions,
} from './marker_schemas';
import type { vectorStylePropertiesSchema, vectorStyleSchema } from './vector_style_schemas';
import type {
  labelBorderSizeOptions,
  labelDynamicOptions,
  labelPositionSchema,
  labelSchema,
  labelStaticOptions,
  labelZoomRangeSchema,
} from './label_schemas';
import type { STYLE_TYPE } from '../../../../../../common/constants';
import type { fieldMetaOptionsSchema } from './field_meta_options_schema';
import type { styleFieldSchema } from './style_field_schema';

export type ColorStaticStylePropertyDescriptor = TypeOf<typeof colorStaticSchema>;
export type ColorDynamicOptions = TypeOf<typeof colorDynamicOptions>;
export type ColorStaticOptions = TypeOf<typeof colorStaticOptions>;
export type ColorDynamicStylePropertyDescriptor = TypeOf<typeof colorDynamicSchema>;
export type ColorStylePropertyDescriptor = TypeOf<typeof colorSchema>;

export type CategoryColorStop = TypeOf<typeof categoryColorStop>;
export type OrdinalColorStop = TypeOf<typeof ordinalColorStop>;

export type IconDynamicOptions = TypeOf<typeof iconDynamicOptions>;
export type IconStaticOptions = TypeOf<typeof iconStaticOptions>;
export type IconStylePropertyDescriptor = TypeOf<typeof iconSchema>;

export type IconStop = TypeOf<typeof iconStop>;

export type LabelDynamicOptions = TypeOf<typeof labelDynamicOptions>;
export type LabelStaticOptions = TypeOf<typeof labelStaticOptions>;
export type LabelStylePropertyDescriptor = TypeOf<typeof labelSchema>;

export type LabelBorderSizeOptions = TypeOf<typeof labelBorderSizeOptions>;
export type LabelPositionStylePropertyDescriptor = TypeOf<typeof labelPositionSchema>;
export type LabelZoomRangeStylePropertyDescriptor = TypeOf<typeof labelZoomRangeSchema>;

export type OrientationDynamicOptions = TypeOf<typeof orientationDynamicOptions>;
export type OrientationStaticOptions = TypeOf<typeof orientationStaticOptions>;
export type OrientationStylePropertyDescriptor = TypeOf<typeof orientationSchema>;

export type SizeDynamicOptions = TypeOf<typeof sizeDynamicOptions>;
export type SizeStaticOptions = TypeOf<typeof sizeStaticOptions>;
export type SizeStylePropertyDescriptor = TypeOf<typeof sizeSchema>;

export type SymbolizeAsOptions = TypeOf<typeof symbolizeAsOptions>;

export type DynamicStylePropertyOptions =
  | ColorDynamicOptions
  | IconDynamicOptions
  | LabelDynamicOptions
  | OrientationDynamicOptions
  | SizeDynamicOptions;

export interface DynamicStyleProperties {
  type: STYLE_TYPE.DYNAMIC;
  options: DynamicStylePropertyOptions;
}

export type StaticStylePropertyOptions =
  | ColorStaticOptions
  | IconStaticOptions
  | LabelStaticOptions
  | OrientationStaticOptions
  | SizeStaticOptions;

export type StylePropertyOptions =
  | LabelBorderSizeOptions
  | LabelPositionStylePropertyDescriptor['options']
  | LabelZoomRangeStylePropertyDescriptor['options']
  | SymbolizeAsOptions
  | DynamicStylePropertyOptions
  | StaticStylePropertyOptions;

export type VectorStylePropertiesDescriptor = Writable<TypeOf<typeof vectorStylePropertiesSchema>>;

export type FieldMetaOptions = TypeOf<typeof fieldMetaOptionsSchema>;
export type StylePropertyField = TypeOf<typeof styleFieldSchema>;

export interface RangeFieldMeta {
  min: number;
  max: number;
  delta: number;
  isMinOutsideStdRange?: boolean;
  isMaxOutsideStdRange?: boolean;
}
export type PercentilesFieldMeta = Array<{
  percentile: string;
  value: number;
}>;
export interface Category {
  key: string;
  count: number;
}
export interface GeometryTypes {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  isPolygonsOnly: boolean;
}
export interface FieldMeta {
  [key: string]: {
    range?: RangeFieldMeta;
    categories: Category[];
  };
}
export interface StyleMetaDescriptor {
  geometryTypes?: GeometryTypes;
  fieldMeta: FieldMeta;
}
export type VectorStyleDescriptor = TypeOf<typeof vectorStyleSchema> & {
  __styleMeta?: StyleMetaDescriptor;
};
