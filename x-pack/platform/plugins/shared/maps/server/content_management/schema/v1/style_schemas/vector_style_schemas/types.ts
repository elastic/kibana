/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
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

export type ColorStaticStylePropertyDescriptor = z.output<typeof colorStaticSchema>;
export type ColorDynamicOptions = z.output<typeof colorDynamicOptions>;
export type ColorStaticOptions = z.output<typeof colorStaticOptions>;
export type ColorDynamicStylePropertyDescriptor = z.output<typeof colorDynamicSchema>;
export type ColorStylePropertyDescriptor = z.output<typeof colorSchema>;

export type CategoryColorStop = z.output<typeof categoryColorStop>;
export type OrdinalColorStop = z.output<typeof ordinalColorStop>;

export type IconDynamicOptions = z.output<typeof iconDynamicOptions>;
export type IconStaticOptions = z.output<typeof iconStaticOptions>;
export type IconStylePropertyDescriptor = z.output<typeof iconSchema>;

export type IconStop = z.output<typeof iconStop>;

export type LabelDynamicOptions = z.output<typeof labelDynamicOptions>;
export type LabelStaticOptions = z.output<typeof labelStaticOptions>;
export type LabelStylePropertyDescriptor = z.output<typeof labelSchema>;

export type LabelBorderSizeOptions = z.output<typeof labelBorderSizeOptions>;
export type LabelPositionStylePropertyDescriptor = z.output<typeof labelPositionSchema>;
export type LabelZoomRangeStylePropertyDescriptor = z.output<typeof labelZoomRangeSchema>;

export type OrientationDynamicOptions = z.output<typeof orientationDynamicOptions>;
export type OrientationStaticOptions = z.output<typeof orientationStaticOptions>;
export type OrientationStylePropertyDescriptor = z.output<typeof orientationSchema>;

export type SizeDynamicOptions = z.output<typeof sizeDynamicOptions>;
export type SizeStaticOptions = z.output<typeof sizeStaticOptions>;
export type SizeStylePropertyDescriptor = z.output<typeof sizeSchema>;

export type SymbolizeAsOptions = z.output<typeof symbolizeAsOptions>;

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

export type VectorStylePropertiesDescriptor = z.output<typeof vectorStylePropertiesSchema>;

export type FieldMetaOptions = z.output<typeof fieldMetaOptionsSchema>;
export type StylePropertyField = z.output<typeof styleFieldSchema>;

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
export type VectorStyleDescriptor = z.output<typeof vectorStyleSchema> & {
  __styleMeta?: StyleMetaDescriptor;
};
