/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FIELD_ORIGIN, LABEL_BORDER_SIZES, SYMBOLIZE_AS_TYPES } from './constants';

// Non-static/dynamic options
export type SymbolizeAsOptions = {
  value: SYMBOLIZE_AS_TYPES;
};

export type LableBorderSizeOptions = {
  size: LABEL_BORDER_SIZES;
};

// Static/dynamic options

export type FieldMetaOptions = {
  isEnabled: boolean;
  sigma?: number;
};

export type StylePropertyField = {
  name: string;
  origin: FIELD_ORIGIN;
};

export type OrdinalColorStop = {
  stop: number;
  color: string;
};

export type CategoryColorStop = {
  stop: string | null;
  color: string;
};

export type IconStop = {
  stop: string | null;
  icon: string;
};

export type ColorDynamicOptions = {
  // ordinal color properties
  color: string; // TODO move color category ramps to constants and make ENUM type
  customColorRamp?: OrdinalColorStop[];
  useCustomColorRamp?: boolean;

  // category color properties
  colorCategory?: string; // TODO move color category palettes to constants and make ENUM type
  customColorPalette?: CategoryColorStop[];
  useCustomColorPalette?: boolean;

  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type ColorStaticOptions = {
  color: string;
};

export type IconDynamicOptions = {
  iconPaletteId?: string;
  customIconStops?: IconStop[];
  useCustomIconMap?: boolean;
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type IconStaticOptions = {
  value: string; // icon id
};

export type LabelDynamicOptions = {
  field: StylePropertyField; // field containing label value
};

export type LabelStaticOptions = {
  value: string; // static label text
};

export type OrientationDynamicOptions = {
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type OrientationStaticOptions = {
  orientation: number;
};

export type SizeDynamicOptions = {
  minSize: number;
  maxSize: number;
  field?: StylePropertyField;
  fieldMetaOptions: FieldMetaOptions;
};

export type SizeStaticOptions = {
  size: number;
};

export type StylePropertyOptions =
  | LableBorderSizeOptions
  | SymbolizeAsOptions
  | DynamicStylePropertyOptions
  | StaticStylePropertyOptions;

export type StaticStylePropertyOptions =
  | ColorStaticOptions
  | IconStaticOptions
  | LabelStaticOptions
  | OrientationStaticOptions
  | SizeStaticOptions;

export type DynamicStylePropertyOptions =
  | ColorDynamicOptions
  | IconDynamicOptions
  | LabelDynamicOptions
  | OrientationDynamicOptions
  | SizeDynamicOptions;
